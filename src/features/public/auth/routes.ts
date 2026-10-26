import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import * as commands from "./commands/index.js";
import type { AuthEmailService } from "./services/index.js";
import type {
  AccessTokenService,
  LoginOtpService,
  RefreshTokenCookieService
} from "../../../shared/authentication/index.js";

const contract = initContract();

export const authPublicContract = contract.router({
  registerUser: commands.registerUserContract,
  registerBusiness: commands.registerBusinessContract,
  login: commands.loginContract,
  refreshToken: commands.refreshTokenContract,
  logout: commands.logoutContract,
  requestPasswordReset: commands.requestPasswordResetContract,
  resetPassword: commands.resetPasswordContract,
  resendVerification: commands.resendVerificationContract,
  verifyEmail: commands.verifyEmailContract,
  verifyLoginOtp: commands.verifyLoginOtpContract
});

export interface AuthPublicRouteDependencies {
  accessToken: AccessTokenService;
  accessTokenTtlSeconds: number;
  authEmail: AuthEmailService;
  database: DatabaseClient;
  loginOtp: LoginOtpService;
  maxOtpAttempts: number;
  passwordResetTokenTtlSeconds: number;
  refreshTokenCookie: RefreshTokenCookieService;
  refreshTokenTtlSeconds: number;
  verificationTokenTtlSeconds: number;
}

export function createAuthPublicHandlers(dependencies: AuthPublicRouteDependencies) {
  return {
    registerUser: commands.createRegisterUserHandler(dependencies),
    registerBusiness: commands.createRegisterBusinessHandler(dependencies),
    login: commands.createLoginHandler(dependencies),
    refreshToken: commands.createRefreshTokenHandler(dependencies),
    logout: commands.createLogoutHandler(dependencies),
    requestPasswordReset: commands.createRequestPasswordResetHandler(dependencies),
    resetPassword: commands.createResetPasswordHandler(dependencies),
    verifyEmail: commands.createVerifyEmailHandler(dependencies),
    resendVerification: commands.createResendVerificationHandler(dependencies),
    verifyLoginOtp: commands.createVerifyLoginOtpHandler(dependencies)
  };
}
