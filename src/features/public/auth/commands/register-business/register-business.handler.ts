import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { hashPassword } from "../../../../../shared/authentication/index.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import type { AuthEmailService } from "../../services/auth-email.js";
import { generateEmailVerificationToken } from "../../services/email-verification-token.js";
import type { registerBusinessContract } from "./register-business.contract.js";
import { registerBusiness } from "./register-business.use-case.js";

function registrationConflictError(): AppError {
  return new AppError({
    code: "business_registration_conflict",
    message: "An account, registration number, or registration document already exists.",
    statusCode: 409,
    title: "Business registration conflict"
  });
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function createRegisterBusinessHandler(dependencies: {
  authEmail: AuthEmailService;
  database: DatabaseClient;
  verificationTokenTtlSeconds: number;
}): AppRouteMutationImplementation<typeof registerBusinessContract> {
  return async ({ body }) => {
    const email = body.user.email.trim().toLowerCase();
    const passwordHash = await hashPassword(body.user.password);
    const verificationToken = generateEmailVerificationToken(dependencies.verificationTokenTtlSeconds);

    try {
      const result = await registerBusiness(dependencies.database, {
        body,
        email,
        passwordHash,
        verificationToken
      });

      try {
        await dependencies.authEmail.sendVerificationEmail({
          displayName: result.user.displayName,
          email: result.user.email,
          token: verificationToken.token,
          tokenId: verificationToken.id
        });
      } catch (cause) {
        throw new AppError({
          cause,
          code: "verification_email_unavailable",
          message:
            "Your account and business application were created, but the verification email could not be sent. Request another verification email.",
          statusCode: 503,
          title: "Verification email unavailable"
        });
      }

      return {
        status: 201,
        body: {
          message:
            "Your business application was submitted for approval. Check your email to verify your account.",
          user: {
            ...result.user,
            status: "PENDING_VERIFICATION" as const
          },
          business: {
            ...result.business,
            status: "PENDING_APPROVAL" as const,
            membershipRole: body.business.membershipRole
          },
          primaryLocation: {
            ...result.primaryLocation,
            status: "DRAFT" as const,
            isPrimary: true as const
          }
        }
      };
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw registrationConflictError();
      }

      throw error;
    }
  };
}
