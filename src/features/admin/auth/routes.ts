import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import type {
  AccessTokenService,
  LoginOtpService,
  RefreshTokenCookieService
} from "../../../shared/authentication/index.js";
import * as commands from "./commands/index.js";
import type { AdminAuthEmailService } from "./services/index.js";
import type { AuthenticationMiddlewares } from "../../../shared/authentication/authentication.middleware.js";

const contract = initContract();

export const authAdminContract = contract.router({
  acceptInvitation: commands.acceptAdminInvitationContract,
  invite: commands.inviteAdminContract,
  login: commands.loginAdminContract,
  verifyLoginOtp: commands.verifyAdminLoginOtpContract,
  refreshSession: commands.refreshAdminSessionContract,
  logout: commands.logoutAdminContract
});

export interface AuthAdminRouteDependencies {
  accessToken: AccessTokenService;
  accessTokenTtlSeconds: number;
  adminAuthEmail: AdminAuthEmailService;
  database: DatabaseClient;
  invitationTokenTtlSeconds: number;
  loginOtp: LoginOtpService;
  maxOtpAttempts: number;
  refreshTokenCookie: RefreshTokenCookieService;
  refreshTokenTtlSeconds: number;
}

export function createAuthAdminHandlers(
  dependencies: AuthAdminRouteDependencies,
  { admin: authenticateAdmin }: AuthenticationMiddlewares
) {
  return {
    acceptInvitation: commands.createAcceptAdminInvitationHandler(dependencies),
    invite: {
      middleware: [authenticateAdmin],
      handler: commands.createInviteAdminHandler(dependencies)
    },
    login: commands.createLoginAdminHandler(dependencies),
    verifyLoginOtp: commands.createVerifyAdminLoginOtpHandler(dependencies),
    refreshSession: commands.createRefreshAdminSessionHandler(dependencies),
    logout: commands.createLogoutAdminHandler(dependencies)
  };
}
