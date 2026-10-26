import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { type LoginOtpService, verifyLoginPassword } from "../../../../../shared/authentication/index.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import type { AuthEmailService } from "../../services/auth-email.js";
import type { loginContract } from "./login.contract.js";

function invalidCredentialsError(): AppError {
  return new AppError({
    code: "invalid_credentials",
    message: "The email address or password is incorrect.",
    statusCode: 401,
    title: "Invalid credentials"
  });
}

function maskEmail(email: string): string {
  const separatorIndex = email.lastIndexOf("@");

  if (separatorIndex <= 0) {
    return "***";
  }

  const localPart = email.slice(0, separatorIndex);
  const domain = email.slice(separatorIndex + 1);

  return `${localPart[0] ?? "*"}${"*".repeat(Math.max(2, localPart.length - 1))}@${domain}`;
}

export function createLoginHandler(dependencies: {
  authEmail: AuthEmailService;
  database: DatabaseClient;
  loginOtp: LoginOtpService;
}): AppRouteMutationImplementation<typeof loginContract> {
  return async ({ body }) => {
    const email = body.email.trim().toLowerCase();
    const user = await dependencies.database.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        displayName: true,
        status: true
      }
    });

    const passwordIsValid = await verifyLoginPassword(user?.passwordHash, body.password);

    if (!user || !passwordIsValid) {
      throw invalidCredentialsError();
    }

    if (user.status !== "ACTIVE" && user.status !== "PENDING_VERIFICATION") {
      throw new AppError({
        code: "account_unavailable",
        message: "This account is not available for sign in.",
        statusCode: 403,
        title: "Account unavailable"
      });
    }

    const loginOtp = dependencies.loginOtp.generate();
    const now = new Date();

    await dependencies.database.$transaction([
      dependencies.database.loginChallenge.updateMany({
        where: {
          userId: user.id,
          consumedAt: null
        },
        data: {
          consumedAt: now
        }
      }),
      dependencies.database.loginChallenge.create({
        data: {
          id: loginOtp.challengeId,
          userId: user.id,
          otpDigest: loginOtp.otpDigest,
          expiresAt: loginOtp.expiresAt
        }
      })
    ]);

    try {
      await dependencies.authEmail.sendLoginOtp({
        challengeId: loginOtp.challengeId,
        displayName: user.displayName,
        email: user.email,
        otp: loginOtp.otp
      });
    } catch (cause) {
      throw new AppError({
        cause,
        code: "login_otp_unavailable",
        message: "The login code could not be sent. Please try again later.",
        statusCode: 503,
        title: "Login code unavailable"
      });
    }

    return {
      status: 202,
      body: {
        challengeId: loginOtp.challengeId,
        expiresAt: loginOtp.expiresAt.toISOString(),
        maskedEmail: maskEmail(user.email),
        message: "Enter the one-time code sent to your email address."
      }
    };
  };
}
