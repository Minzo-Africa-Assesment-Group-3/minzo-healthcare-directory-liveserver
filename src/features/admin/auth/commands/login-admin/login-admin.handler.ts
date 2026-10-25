import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { type LoginOtpService, verifyLoginPassword } from "../../../../../shared/authentication/index.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import type { AdminAuthEmailService } from "../../services/index.js";
import type { loginAdminContract } from "./login-admin.contract.js";

function invalidCredentialsError(): AppError {
  return new AppError({
    code: "invalid_admin_credentials",
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

export function createLoginAdminHandler(dependencies: {
  adminAuthEmail: AdminAuthEmailService;
  database: DatabaseClient;
  loginOtp: LoginOtpService;
}): AppRouteMutationImplementation<typeof loginAdminContract> {
  return async ({ body }) => {
    const email = body.email.trim().toLowerCase();
    const admin = await dependencies.database.adminUser.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        displayName: true,
        status: true,
        emailVerifiedAt: true
      }
    });

    const passwordIsValid = await verifyLoginPassword(admin?.passwordHash, body.password);

    if (!admin || !passwordIsValid) {
      throw invalidCredentialsError();
    }

    if (admin.status !== "ACTIVE" || !admin.emailVerifiedAt) {
      throw new AppError({
        code: "admin_account_unavailable",
        message: "This administrator account is not available for sign in.",
        statusCode: 403,
        title: "Administrator account unavailable"
      });
    }

    const loginOtp = dependencies.loginOtp.generate();
    const now = new Date();

    await dependencies.database.$transaction([
      dependencies.database.adminLoginChallenge.updateMany({
        where: { adminUserId: admin.id, consumedAt: null },
        data: { consumedAt: now }
      }),
      dependencies.database.adminLoginChallenge.create({
        data: {
          id: loginOtp.challengeId,
          adminUserId: admin.id,
          otpDigest: loginOtp.otpDigest,
          expiresAt: loginOtp.expiresAt
        }
      })
    ]);

    try {
      await dependencies.adminAuthEmail.sendLoginOtp({
        challengeId: loginOtp.challengeId,
        displayName: admin.displayName,
        email: admin.email,
        otp: loginOtp.otp
      });
    } catch (cause) {
      throw new AppError({
        cause,
        code: "admin_login_otp_unavailable",
        message: "The admin login code could not be sent. Try again later.",
        statusCode: 503,
        title: "Admin login code unavailable"
      });
    }

    return {
      status: 202,
      body: {
        challengeId: loginOtp.challengeId,
        expiresAt: loginOtp.expiresAt.toISOString(),
        maskedEmail: maskEmail(admin.email),
        message: "Enter the one-time code sent to the administrator email."
      }
    };
  };
}
