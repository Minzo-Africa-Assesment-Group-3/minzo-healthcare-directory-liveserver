import type { Environment } from "../config/env.js";
import { createAuthEmailService } from "../features/auth-public/services/index.js";
import type { AuthPublicRouteDependencies } from "../features/auth-public/routes.js";
import type { DatabaseClient } from "../infrastructure/database/index.js";
import type { EmailSender } from "../infrastructure/email/index.js";
import {
  createAccessTokenService,
  createLoginOtpService,
  createRefreshTokenCookieService
} from "../shared/authentication/index.js";

interface CreateAuthPublicDependenciesOptions {
  database: DatabaseClient;
  emailSender: EmailSender;
  env: Environment;
}

type AuthPublicServiceDependencies = Omit<AuthPublicRouteDependencies, "rateLimiters">;

export function createAuthPublicDependencies({
  database,
  emailSender,
  env
}: CreateAuthPublicDependenciesOptions): AuthPublicServiceDependencies {
  const authEmail = createAuthEmailService(emailSender, env.FRONTEND_URL);
  const accessToken = createAccessTokenService({
    audience: env.JWT_AUDIENCE,
    issuer: env.JWT_ISSUER,
    realm: "user",
    secret: env.JWT_ACCESS_SECRET,
    ttlSeconds: env.JWT_ACCESS_TOKEN_TTL_SECONDS
  });
  const loginOtp = createLoginOtpService({
    secret: env.LOGIN_OTP_HMAC_SECRET,
    ttlSeconds: env.LOGIN_OTP_TTL_SECONDS
  });
  const refreshTokenCookie = createRefreshTokenCookieService({
    name: "refresh_token",
    path: "/api/v1/auth",
    secure: env.NODE_ENV === "production"
  });

  return {
    accessToken,
    accessTokenTtlSeconds: env.JWT_ACCESS_TOKEN_TTL_SECONDS,
    database,
    authEmail,
    loginOtp,
    maxOtpAttempts: env.LOGIN_OTP_MAX_ATTEMPTS,
    passwordResetTokenTtlSeconds: env.PASSWORD_RESET_TOKEN_TTL_SECONDS,
    refreshTokenCookie,
    refreshTokenTtlSeconds: env.REFRESH_TOKEN_TTL_SECONDS,
    verificationTokenTtlSeconds: env.EMAIL_VERIFICATION_TOKEN_TTL_SECONDS
  };
}
