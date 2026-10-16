import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { Prisma } from "../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { hashPassword } from "../../../../shared/authentication/index.js";
import type { AuthEmailService } from "../../services/auth-email.js";
import { generateEmailVerificationToken } from "../../services/email-verification-token.js";
import type { registerUserContract } from "./register-user.contract.js";

function createEmailAlreadyRegisteredError(): AppError {
  return new AppError({
    code: "email_already_registered",
    message: "An account with this email address already exists.",
    statusCode: 409,
    title: "Email already registered",
  });
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export function createRegisterUserHandler(dependencies: {
  authEmail: AuthEmailService;
  database: DatabaseClient;
  verificationTokenTtlSeconds: number;
}): AppRouteMutationImplementation<typeof registerUserContract> {
  return async ({ body }) => {
    const email = body.email.trim().toLowerCase();
    const existingUser = await dependencies.database.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw createEmailAlreadyRegisteredError();
    }

    const passwordHash = await hashPassword(body.password);
    const verificationToken = generateEmailVerificationToken(
      dependencies.verificationTokenTtlSeconds,
    );

    try {
      const user = await dependencies.database.user.create({
        data: {
          email,
          passwordHash,
          displayName: body.displayName.trim(),
          phone: body.phone?.trim() ?? null,
          status: "PENDING_VERIFICATION",
          emailVerificationTokens: {
            create: {
              id: verificationToken.id,
              tokenHash: verificationToken.tokenHash,
              expiresAt: verificationToken.expiresAt,
            },
          },
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          phone: true,
          createdAt: true,
        },
      });

      try {
        await dependencies.authEmail.sendVerificationEmail({
          displayName: user.displayName,
          email: user.email,
          token: verificationToken.token,
          tokenId: verificationToken.id,
        });
      } catch (cause) {
        throw new AppError({
          cause,
          code: "verification_email_unavailable",
          message:
            "Your account was created, but the verification email could not be sent. Please request another verification email.",
          statusCode: 503,
          title: "Verification email unavailable",
        });
      }

      return {
        status: 201,
        body: {
          message: "Check your email to verify your account.",
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            phone: user.phone,
            status: "PENDING_VERIFICATION",
            createdAt: user.createdAt.toISOString(),
          },
        },
      };
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw createEmailAlreadyRegisteredError();
      }

      throw error;
    }
  };
}
