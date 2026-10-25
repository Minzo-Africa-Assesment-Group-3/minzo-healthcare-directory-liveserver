import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import type { AuthEmailService } from "../../services/auth-email.js";
import { generateEmailVerificationToken } from "../../services/email-verification-token.js";
import type { resendVerificationContract } from "./resend-verification.contract.js";

const acceptedResponse = {
  status: 202,
  body: {
    message: "If the account is eligible, a verification email will be sent."
  }
} as const;

export function createResendVerificationHandler(dependencies: {
  authEmail: AuthEmailService;
  database: DatabaseClient;
  verificationTokenTtlSeconds: number;
}): AppRouteMutationImplementation<typeof resendVerificationContract> {
  return async ({ body }) => {
    const email = body.email.trim().toLowerCase();
    const user = await dependencies.database.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        emailVerifiedAt: true,
        emailVerificationTokens: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true }
        }
      }
    });

    if (!user || user.status !== "PENDING_VERIFICATION" || user.emailVerifiedAt) {
      return acceptedResponse;
    }

    const latestToken = user.emailVerificationTokens[0];
    const resendAvailableAt = latestToken ? latestToken.createdAt.getTime() + 60_000 : 0;

    if (Date.now() < resendAvailableAt) {
      return acceptedResponse;
    }

    const verificationToken = generateEmailVerificationToken(dependencies.verificationTokenTtlSeconds);

    await dependencies.database.$transaction([
      dependencies.database.emailVerificationToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null
        }
      }),
      dependencies.database.emailVerificationToken.create({
        data: {
          id: verificationToken.id,
          userId: user.id,
          tokenHash: verificationToken.tokenHash,
          expiresAt: verificationToken.expiresAt
        }
      })
    ]);

    try {
      await dependencies.authEmail.sendVerificationEmail({
        displayName: user.displayName,
        email: user.email,
        token: verificationToken.token,
        tokenId: verificationToken.id
      });
    } catch (cause) {
      throw new AppError({
        cause,
        code: "verification_email_unavailable",
        message: "The verification email could not be sent. Please try again later.",
        statusCode: 503,
        title: "Verification email unavailable"
      });
    }

    return acceptedResponse;
  };
}
