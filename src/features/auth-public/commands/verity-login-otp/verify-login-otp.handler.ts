import { randomUUID } from "node:crypto";

import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import {
  type AccessTokenService,
  generateRefreshToken,
  type LoginOtpService,
  type RefreshTokenCookieService,
} from "../../../../shared/authentication/index.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import type { verifyLoginOtpContract } from "./verify-login-otp.contract.js";

function invalidOtpError(): AppError {
  return new AppError({
    code: "invalid_login_code",
    message: "The login code is invalid, expired, or has already been used.",
    statusCode: 401,
    title: "Invalid login code",
  });
}

export function createVerifyLoginOtpHandler(dependencies: {
  accessToken: AccessTokenService;
  accessTokenTtlSeconds: number;
  database: DatabaseClient;
  loginOtp: LoginOtpService;
  maxOtpAttempts: number;
  refreshTokenCookie: RefreshTokenCookieService;
  refreshTokenTtlSeconds: number;
}): AppRouteMutationImplementation<typeof verifyLoginOtpContract> {
  return async ({ body, res }) => {
    const challenge = await dependencies.database.loginChallenge.findUnique({
      where: { id: body.challengeId },
      select: {
        id: true,
        otpDigest: true,
        failedAttempts: true,
        expiresAt: true,
        consumedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            status: true,
            emailVerifiedAt: true,
          },
        },
      },
    });

    const now = new Date();

    if (
      !challenge ||
      challenge.consumedAt ||
      challenge.expiresAt <= now ||
      challenge.failedAttempts >= dependencies.maxOtpAttempts ||
      challenge.user.status !== "ACTIVE" ||
      !challenge.user.emailVerifiedAt
    ) {
      throw invalidOtpError();
    }

    const otpIsValid = dependencies.loginOtp.verify(
      challenge.id,
      body.otp,
      challenge.otpDigest,
    );

    if (!otpIsValid) {
      await dependencies.database.loginChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          expiresAt: { gt: now },
          failedAttempts: { lt: dependencies.maxOtpAttempts },
        },
        data: {
          failedAttempts: { increment: 1 },
        },
      });

      throw invalidOtpError();
    }

    const refreshToken = generateRefreshToken(
      dependencies.refreshTokenTtlSeconds,
      now,
    );
    const accessToken = await dependencies.accessToken.create({
      subjectId: challenge.user.id,
    });

    await dependencies.database.$transaction(async (transaction) => {
      const consumedChallenge = await transaction.loginChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          expiresAt: { gt: now },
          failedAttempts: { lt: dependencies.maxOtpAttempts },
        },
        data: {
          consumedAt: now,
        },
      });

      if (consumedChallenge.count !== 1) {
        throw invalidOtpError();
      }

      await transaction.refreshToken.create({
        data: {
          userId: challenge.user.id,
          familyId: randomUUID(),
          tokenHash: refreshToken.tokenHash,
          expiresAt: refreshToken.expiresAt,
        },
      });
    });

    dependencies.refreshTokenCookie.set(
      res,
      refreshToken.token,
      dependencies.refreshTokenTtlSeconds,
    );

    return {
      status: 200,
      body: {
        accessToken,
        tokenType: "Bearer",
        expiresIn: dependencies.accessTokenTtlSeconds,
        refreshTokenExpiresAt: refreshToken.expiresAt.toISOString(),
        user: {
          id: challenge.user.id,
          email: challenge.user.email,
          displayName: challenge.user.displayName,
        },
      },
    };
  };
}
