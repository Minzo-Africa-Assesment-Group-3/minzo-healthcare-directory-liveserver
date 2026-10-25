import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import type { AuthEmailService } from "../../services/auth-email.js";
import { generatePasswordResetToken } from "../../services/password-reset-token.js";
import type { requestPasswordResetContract } from "./request-password-reset.contract.js";

const acceptedResponse = {
  status: 202,
  body: {
    message: "If an eligible account exists, password-reset instructions have been sent."
  }
} as const;

export function createRequestPasswordResetHandler(dependencies: {
  authEmail: AuthEmailService;
  database: DatabaseClient;
  passwordResetTokenTtlSeconds: number;
}): AppRouteMutationImplementation<typeof requestPasswordResetContract> {
  return async ({ body }) => {
    const email = body.email.trim().toLowerCase();
    const user = await dependencies.database.user.findFirst({
      where: {
        email,
        status: "ACTIVE",
        deletedAt: null
      },
      select: {
        id: true,
        email: true,
        displayName: true
      }
    });

    if (!user) {
      return acceptedResponse;
    }

    const passwordResetToken = generatePasswordResetToken(dependencies.passwordResetTokenTtlSeconds);

    await dependencies.database.$transaction([
      dependencies.database.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null
        }
      }),
      dependencies.database.passwordResetToken.create({
        data: {
          id: passwordResetToken.id,
          userId: user.id,
          tokenHash: passwordResetToken.tokenHash,
          expiresAt: passwordResetToken.expiresAt
        }
      })
    ]);

    try {
      await dependencies.authEmail.sendPasswordResetEmail({
        displayName: user.displayName,
        email: user.email,
        token: passwordResetToken.token,
        tokenId: passwordResetToken.id
      });
    } catch {
      // The public response intentionally remains identical so this endpoint does not reveal account existence.
    }

    return acceptedResponse;
  };
}
