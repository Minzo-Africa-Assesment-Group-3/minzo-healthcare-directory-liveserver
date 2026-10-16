import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../infrastructure/database/index.js";
import * as commands from "./commands/index.js";
import type {
  AuthEmailService,
} from "./services/index.js";
import type {
  AccessTokenService,
  LoginOtpService,
  RefreshTokenCookieService,
} from "../../shared/authentication/index.js";
import type { AuthPublicRateLimitMiddlewares } from "../../shared/middleware/rate-limit.middleware.js";

const contract = initContract();

export const authPublicContract = contract.router({
  registerUser: commands.registerUserContract,
  registerBusiness: commands.registerBusinessContract,
  login: commands.loginContract,
  refreshToken: commands.refreshTokenContract,
  logout: commands.logoutContract,
  resendVerification: commands.resendVerificationContract,
  verifyEmail: commands.verifyEmailContract,
  verifyLoginOtp: commands.verifyLoginOtpContract,
});

export interface AuthPublicRouteDependencies {
  accessToken: AccessTokenService;
  accessTokenTtlSeconds: number;
  authEmail: AuthEmailService;
  database: DatabaseClient;
  loginOtp: LoginOtpService;
  maxOtpAttempts: number;
  refreshTokenCookie: RefreshTokenCookieService;
  refreshTokenTtlSeconds: number;
  verificationTokenTtlSeconds: number;
}

export function createAuthPublicHandlers(
  dependencies: AuthPublicRouteDependencies,
  rateLimiters: AuthPublicRateLimitMiddlewares,
) {
  return {
    registerUser: {
      middleware: [rateLimiters.register],
      handler: commands.createRegisterUserHandler(dependencies),
    },
    registerBusiness: {
      middleware: [rateLimiters.register],
      handler: commands.createRegisterBusinessHandler(dependencies),
    },
    login: {
      middleware: [rateLimiters.login],
      handler: commands.createLoginHandler(dependencies),
    },
    refreshToken: {
      middleware: [rateLimiters.refreshToken],
      handler: commands.createRefreshTokenHandler(dependencies),
    },
    logout: {
      middleware: [rateLimiters.logout],
      handler: commands.createLogoutHandler(dependencies),
    },
    verifyEmail: {
      middleware: [rateLimiters.verifyEmail],
      handler: commands.createVerifyEmailHandler(dependencies),
    },
    resendVerification: {
      middleware: [rateLimiters.resendVerification],
      handler: commands.createResendVerificationHandler(dependencies),
    },
    verifyLoginOtp: {
      middleware: [rateLimiters.verifyLoginOtp],
      handler: commands.createVerifyLoginOtpHandler(dependencies),
    },
  };
}
