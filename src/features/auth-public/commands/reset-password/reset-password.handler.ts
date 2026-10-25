import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { hashPassword } from "../../../../shared/authentication/index.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { hashPasswordResetToken } from "../../services/password-reset-token.js";
import type { resetPasswordContract } from "./reset-password.contract.js";

function invalidTokenError(): AppError {
  return new AppError({
    code: "invalid_password_reset_token",
    message: "The password-reset link is invalid or has already been used.",
    statusCode: 400,
    title: "Invalid password-reset link"
  });
}

export function createResetPasswordHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof resetPasswordContract> {
  return async ({ body }) => {
    const passwordResetToken = await dependencies.database.passwordResetToken.findUnique({
      where: {
        tokenHash: hashPasswordResetToken(body.token)
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: {
          select: {
            deletedAt: true,
            status: true
          }
        }
      }
    });

    if (
      !passwordResetToken ||
      passwordResetToken.usedAt ||
      passwordResetToken.user.deletedAt ||
      passwordResetToken.user.status !== "ACTIVE"
    ) {
      throw invalidTokenError();
    }

    const now = new Date();

    if (passwordResetToken.expiresAt <= now) {
      throw new AppError({
        code: "password_reset_token_expired",
        message: "The password-reset link has expired. Request a new one.",
        statusCode: 410,
        title: "Password-reset link expired"
      });
    }

    const passwordHash = await hashPassword(body.password);

    await dependencies.database.$transaction(async (transaction) => {
      const consumedToken = await transaction.passwordResetToken.updateMany({
        where: {
          id: passwordResetToken.id,
          usedAt: null,
          expiresAt: { gt: now }
        },
        data: { usedAt: now }
      });

      if (consumedToken.count !== 1) {
        throw invalidTokenError();
      }

      const changedUser = await transaction.user.updateMany({
        where: {
          id: passwordResetToken.userId,
          status: "ACTIVE",
          deletedAt: null
        },
        data: { passwordHash }
      });

      if (changedUser.count !== 1) {
        throw invalidTokenError();
      }

      await transaction.refreshToken.updateMany({
        where: {
          userId: passwordResetToken.userId,
          revokedAt: null
        },
        data: {
          revokedAt: now,
          revocationReason: "PASSWORD_CHANGED"
        }
      });

      await transaction.loginChallenge.updateMany({
        where: {
          userId: passwordResetToken.userId,
          consumedAt: null
        },
        data: { consumedAt: now }
      });
    });

    return {
      status: 200,
      body: {
        message: "Your password has been reset. Please sign in again."
      }
    };
  };
}
