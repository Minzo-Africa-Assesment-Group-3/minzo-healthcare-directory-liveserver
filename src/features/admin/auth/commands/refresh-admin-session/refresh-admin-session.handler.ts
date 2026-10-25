import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import {
  type AccessTokenService,
  generateRefreshToken,
  hashRefreshToken,
  type RefreshTokenCookieService
} from "../../../../../shared/authentication/index.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import type { refreshAdminSessionContract } from "./refresh-admin-session.contract.js";

function invalidRefreshTokenError(): AppError {
  return new AppError({
    code: "invalid_admin_refresh_token",
    message: "The admin refresh token is invalid, expired, or revoked.",
    statusCode: 401,
    title: "Invalid admin refresh token"
  });
}

export function createRefreshAdminSessionHandler(dependencies: {
  accessToken: AccessTokenService;
  accessTokenTtlSeconds: number;
  database: DatabaseClient;
  refreshTokenCookie: RefreshTokenCookieService;
  refreshTokenTtlSeconds: number;
}): AppRouteMutationImplementation<typeof refreshAdminSessionContract> {
  return async ({ req, res }) => {
    const rawToken = dependencies.refreshTokenCookie.read(req);

    if (!rawToken) {
      dependencies.refreshTokenCookie.clear(res);
      throw invalidRefreshTokenError();
    }

    const storedToken = await dependencies.database.adminRefreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rawToken) },
      select: {
        id: true,
        adminUserId: true,
        familyId: true,
        expiresAt: true,
        revokedAt: true,
        revocationReason: true,
        adminUser: { select: { status: true, emailVerifiedAt: true } }
      }
    });

    if (!storedToken) {
      dependencies.refreshTokenCookie.clear(res);
      throw invalidRefreshTokenError();
    }

    const now = new Date();

    if (storedToken.revokedAt) {
      if (storedToken.revocationReason === "ROTATED") {
        await dependencies.database.adminRefreshToken.updateMany({
          where: { familyId: storedToken.familyId, revokedAt: null },
          data: { revokedAt: now, revocationReason: "REUSE_DETECTED" }
        });
      }

      dependencies.refreshTokenCookie.clear(res);
      throw invalidRefreshTokenError();
    }

    if (storedToken.expiresAt <= now) {
      dependencies.refreshTokenCookie.clear(res);
      throw invalidRefreshTokenError();
    }

    if (storedToken.adminUser.status !== "ACTIVE" || !storedToken.adminUser.emailVerifiedAt) {
      await dependencies.database.adminRefreshToken.updateMany({
        where: { familyId: storedToken.familyId, revokedAt: null },
        data: { revokedAt: now, revocationReason: "ADMIN_REVOKED" }
      });
      dependencies.refreshTokenCookie.clear(res);
      throw invalidRefreshTokenError();
    }

    const nextRefreshToken = generateRefreshToken(dependencies.refreshTokenTtlSeconds, now);
    const accessToken = await dependencies.accessToken.create({
      subjectId: storedToken.adminUserId
    });

    await dependencies.database.$transaction(async (transaction) => {
      const replacement = await transaction.adminRefreshToken.create({
        data: {
          adminUserId: storedToken.adminUserId,
          familyId: storedToken.familyId,
          tokenHash: nextRefreshToken.tokenHash,
          expiresAt: nextRefreshToken.expiresAt
        },
        select: { id: true }
      });

      const rotatedToken = await transaction.adminRefreshToken.updateMany({
        where: {
          id: storedToken.id,
          revokedAt: null,
          expiresAt: { gt: now }
        },
        data: {
          revokedAt: now,
          revocationReason: "ROTATED",
          replacedByTokenId: replacement.id
        }
      });

      if (rotatedToken.count !== 1) {
        throw invalidRefreshTokenError();
      }
    });

    dependencies.refreshTokenCookie.set(res, nextRefreshToken.token, dependencies.refreshTokenTtlSeconds);

    return {
      status: 200,
      body: {
        accessToken,
        tokenType: "Bearer",
        expiresIn: dependencies.accessTokenTtlSeconds,
        refreshTokenExpiresAt: nextRefreshToken.expiresAt.toISOString()
      }
    };
  };
}
