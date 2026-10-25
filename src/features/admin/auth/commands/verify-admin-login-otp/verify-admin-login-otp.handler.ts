import { randomUUID } from "node:crypto";

import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import {
  type AccessTokenService,
  generateRefreshToken,
  type LoginOtpService,
  type RefreshTokenCookieService
} from "../../../../../shared/authentication/index.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import type { verifyAdminLoginOtpContract } from "./verify-admin-login-otp.contract.js";

function invalidOtpError(): AppError {
  return new AppError({
    code: "invalid_admin_login_code",
    message: "The login code is invalid, expired, or has already been used.",
    statusCode: 401,
    title: "Invalid admin login code"
  });
}

export function createVerifyAdminLoginOtpHandler(dependencies: {
  accessToken: AccessTokenService;
  accessTokenTtlSeconds: number;
  database: DatabaseClient;
  loginOtp: LoginOtpService;
  maxOtpAttempts: number;
  refreshTokenCookie: RefreshTokenCookieService;
  refreshTokenTtlSeconds: number;
}): AppRouteMutationImplementation<typeof verifyAdminLoginOtpContract> {
  return async ({ body, res }) => {
    const challenge = await dependencies.database.adminLoginChallenge.findUnique({
      where: { id: body.challengeId },
      select: {
        id: true,
        otpDigest: true,
        failedAttempts: true,
        expiresAt: true,
        consumedAt: true,
        adminUser: {
          select: {
            id: true,
            email: true,
            displayName: true,
            status: true,
            emailVerifiedAt: true,
            roles: {
              select: { role: { select: { name: true } } }
            }
          }
        }
      }
    });

    const now = new Date();

    if (
      !challenge ||
      challenge.consumedAt ||
      challenge.expiresAt <= now ||
      challenge.failedAttempts >= dependencies.maxOtpAttempts ||
      challenge.adminUser.status !== "ACTIVE" ||
      !challenge.adminUser.emailVerifiedAt
    ) {
      throw invalidOtpError();
    }

    if (!dependencies.loginOtp.verify(challenge.id, body.otp, challenge.otpDigest)) {
      await dependencies.database.adminLoginChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          expiresAt: { gt: now },
          failedAttempts: { lt: dependencies.maxOtpAttempts }
        },
        data: { failedAttempts: { increment: 1 } }
      });

      throw invalidOtpError();
    }

    const refreshToken = generateRefreshToken(dependencies.refreshTokenTtlSeconds, now);
    const accessToken = await dependencies.accessToken.create({
      subjectId: challenge.adminUser.id
    });

    await dependencies.database.$transaction(async (transaction) => {
      const consumedChallenge = await transaction.adminLoginChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          expiresAt: { gt: now },
          failedAttempts: { lt: dependencies.maxOtpAttempts }
        },
        data: { consumedAt: now }
      });

      if (consumedChallenge.count !== 1) {
        throw invalidOtpError();
      }

      await transaction.adminRefreshToken.create({
        data: {
          adminUserId: challenge.adminUser.id,
          familyId: randomUUID(),
          tokenHash: refreshToken.tokenHash,
          expiresAt: refreshToken.expiresAt
        }
      });
    });

    dependencies.refreshTokenCookie.set(res, refreshToken.token, dependencies.refreshTokenTtlSeconds);

    return {
      status: 200,
      body: {
        accessToken,
        tokenType: "Bearer",
        expiresIn: dependencies.accessTokenTtlSeconds,
        refreshTokenExpiresAt: refreshToken.expiresAt.toISOString(),
        admin: {
          id: challenge.adminUser.id,
          email: challenge.adminUser.email,
          displayName: challenge.adminUser.displayName,
          roles: challenge.adminUser.roles.map(({ role }) => role.name)
        }
      }
    };
  };
}
