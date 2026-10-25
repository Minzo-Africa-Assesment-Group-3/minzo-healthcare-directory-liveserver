import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { hashEmailVerificationToken } from "../../services/email-verification-token.js";
import type { verifyEmailContract } from "./verify-email.contract.js";

function invalidTokenError(): AppError {
  return new AppError({
    code: "invalid_verification_token",
    message: "The email verification token is invalid or has already been used.",
    statusCode: 400,
    title: "Invalid verification token"
  });
}

export function createVerifyEmailHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof verifyEmailContract> {
  return async ({ body }) => {
    const tokenRecord = await dependencies.database.emailVerificationToken.findUnique({
      where: {
        tokenHash: hashEmailVerificationToken(body.token)
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: {
          select: {
            email: true
          }
        }
      }
    });

    if (!tokenRecord || tokenRecord.usedAt) {
      throw invalidTokenError();
    }

    const now = new Date();

    if (tokenRecord.expiresAt <= now) {
      throw new AppError({
        code: "verification_token_expired",
        message: "The email verification token has expired. Request a new verification email.",
        statusCode: 410,
        title: "Verification token expired"
      });
    }

    await dependencies.database.$transaction(async (transaction) => {
      const consumedToken = await transaction.emailVerificationToken.updateMany({
        where: {
          id: tokenRecord.id,
          usedAt: null,
          expiresAt: { gt: now }
        },
        data: { usedAt: now }
      });

      if (consumedToken.count !== 1) {
        throw invalidTokenError();
      }

      const activatedUser = await transaction.user.updateMany({
        where: {
          id: tokenRecord.userId,
          status: "PENDING_VERIFICATION",
          emailVerifiedAt: null
        },
        data: {
          status: "ACTIVE",
          emailVerifiedAt: now
        }
      });

      if (activatedUser.count !== 1) {
        throw invalidTokenError();
      }
    });

    return {
      status: 200,
      body: {
        verified: true,
        email: tokenRecord.user.email
      }
    };
  };
}
