import type { Environment } from "../config/env.js";
import { createAdminAuthEmailService } from "../features/admin/auth/services/index.js";
import type { AuthAdminRouteDependencies } from "../features/admin/auth/routes.js";
import type { DatabaseClient } from "../infrastructure/database/index.js";
import type { EmailSender } from "../infrastructure/email/index.js";
import {
  createAccessTokenService,
  createLoginOtpService,
  createRefreshTokenCookieService
} from "../shared/authentication/index.js";

interface CreateAuthAdminDependenciesOptions {
  database: DatabaseClient;
  emailSender: EmailSender;
  env: Environment;
}

type AuthAdminServiceDependencies = Omit<AuthAdminRouteDependencies, "rateLimiters">;

export function createAuthAdminDependencies({
  database,
  emailSender,
  env
}: CreateAuthAdminDependenciesOptions): AuthAdminServiceDependencies {
  return {
    accessToken: createAccessTokenService({
      audience: env.ADMIN_JWT_AUDIENCE,
      issuer: env.JWT_ISSUER,
      realm: "admin",
      secret: env.ADMIN_JWT_ACCESS_SECRET,
      ttlSeconds: env.ADMIN_JWT_ACCESS_TOKEN_TTL_SECONDS
    }),
    accessTokenTtlSeconds: env.ADMIN_JWT_ACCESS_TOKEN_TTL_SECONDS,
    adminAuthEmail: createAdminAuthEmailService(emailSender, env.FRONTEND_URL),
    database,
    invitationTokenTtlSeconds: env.ADMIN_INVITATION_TOKEN_TTL_SECONDS,
    loginOtp: createLoginOtpService({
      secret: env.ADMIN_LOGIN_OTP_HMAC_SECRET,
      ttlSeconds: env.ADMIN_LOGIN_OTP_TTL_SECONDS
    }),
    maxOtpAttempts: env.ADMIN_LOGIN_OTP_MAX_ATTEMPTS,
    refreshTokenCookie: createRefreshTokenCookieService({
      name: "admin_refresh_token",
      path: "/api/v1/admin/auth",
      secure: env.NODE_ENV === "production"
    }),
    refreshTokenTtlSeconds: env.ADMIN_REFRESH_TOKEN_TTL_SECONDS
  };
}
