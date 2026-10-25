import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import {
  type AccessTokenService,
  generateRefreshToken,
  hashRefreshToken,
  type RefreshTokenCookieService
} from "../../../../../shared/authentication/index.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import type { refreshTokenContract } from "./refresh-token.contract.js";

function invalidRefreshTokenError(): AppError {
  return new AppError({
    code: "invalid_refresh_token",
    message: "The refresh token is invalid, expired, or has been revoked.",
    statusCode: 401,
    title: "Invalid refresh token"
  });
}

export function createRefreshTokenHandler(dependencies: {
  accessToken: AccessTokenService;
  accessTokenTtlSeconds: number;
  database: DatabaseClient;
  refreshTokenCookie: RefreshTokenCookieService;
  refreshTokenTtlSeconds: number;
}): AppRouteMutationImplementation<typeof refreshTokenContract> {
  return async ({ req, res }) => {
    const rawToken = dependencies.refreshTokenCookie.read(req);

    if (!rawToken) {
      dependencies.refreshTokenCookie.clear(res);
      throw invalidRefreshTokenError();
    }

    const storedToken = await dependencies.database.refreshToken.findUnique({
      where: {
        tokenHash: hashRefreshToken(rawToken)
      },
      select: {
        id: true,
        userId: true,
        familyId: true,
        expiresAt: true,
        revokedAt: true,
        revocationReason: true,
        user: {
          select: {
            status: true,
            emailVerifiedAt: true
          }
        }
      }
    });

    if (!storedToken) {
      dependencies.refreshTokenCookie.clear(res);
      throw invalidRefreshTokenError();
    }

    const now = new Date();

    if (storedToken.revokedAt) {
      if (storedToken.revocationReason === "ROTATED") {
        await dependencies.database.refreshToken.updateMany({
          where: {
            familyId: storedToken.familyId,
            revokedAt: null
          },
          data: {
            revokedAt: now,
            revocationReason: "REUSE_DETECTED"
          }
        });
      }

      dependencies.refreshTokenCookie.clear(res);
      throw invalidRefreshTokenError();
    }

    if (storedToken.expiresAt <= now) {
      dependencies.refreshTokenCookie.clear(res);
      throw invalidRefreshTokenError();
    }

    if (storedToken.user.status !== "ACTIVE" || !storedToken.user.emailVerifiedAt) {
      await dependencies.database.refreshToken.updateMany({
        where: {
          familyId: storedToken.familyId,
          revokedAt: null
        },
        data: {
          revokedAt: now,
          revocationReason: "ADMIN_REVOKED"
        }
      });

      dependencies.refreshTokenCookie.clear(res);
      throw invalidRefreshTokenError();
    }

    const nextRefreshToken = generateRefreshToken(dependencies.refreshTokenTtlSeconds, now);
    const accessToken = await dependencies.accessToken.create({
      subjectId: storedToken.userId
    });

    await dependencies.database.$transaction(async (transaction) => {
      const replacement = await transaction.refreshToken.create({
        data: {
          userId: storedToken.userId,
          familyId: storedToken.familyId,
          tokenHash: nextRefreshToken.tokenHash,
          expiresAt: nextRefreshToken.expiresAt
        },
        select: {
          id: true
        }
      });

      const rotatedToken = await transaction.refreshToken.updateMany({
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
