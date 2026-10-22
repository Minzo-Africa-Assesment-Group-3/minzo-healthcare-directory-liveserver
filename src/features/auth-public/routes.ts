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
  rateLimiters: AuthPublicRateLimitMiddlewares;
  verificationTokenTtlSeconds: number;
}

export function createAuthPublicHandlers(
  dependencies: AuthPublicRouteDependencies,
) {
  return {
    registerUser: {
      middleware: [dependencies.rateLimiters.registration],
      handler: commands.createRegisterUserHandler(dependencies),
    },
    registerBusiness: {
      middleware: [dependencies.rateLimiters.registration],
      handler: commands.createRegisterBusinessHandler(dependencies),
    },
    login: {
      middleware: [dependencies.rateLimiters.credential],
      handler: commands.createLoginHandler(dependencies),
    },
    refreshToken: commands.createRefreshTokenHandler(dependencies),
    logout: commands.createLogoutHandler(dependencies),
    verifyEmail: commands.createVerifyEmailHandler(dependencies),
    resendVerification: {
      middleware: [dependencies.rateLimiters.registration],
      handler: commands.createResendVerificationHandler(dependencies),
    },
    verifyLoginOtp: {
      middleware: [dependencies.rateLimiters.credential],
      handler: commands.createVerifyLoginOtpHandler(dependencies),
    },
  };
}
