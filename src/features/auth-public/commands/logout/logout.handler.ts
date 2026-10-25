import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { hashRefreshToken, type RefreshTokenCookieService } from "../../../../shared/authentication/index.js";
import type { logoutContract } from "./logout.contract.js";

export function createLogoutHandler(dependencies: {
  database: DatabaseClient;
  refreshTokenCookie: RefreshTokenCookieService;
}): AppRouteMutationImplementation<typeof logoutContract> {
  return async ({ req, res }) => {
    const rawToken = dependencies.refreshTokenCookie.read(req);

    if (rawToken) {
      const storedToken = await dependencies.database.refreshToken.findUnique({
        where: {
          tokenHash: hashRefreshToken(rawToken)
        },
        select: {
          familyId: true
        }
      });

      if (storedToken) {
        await dependencies.database.refreshToken.updateMany({
          where: {
            familyId: storedToken.familyId,
            revokedAt: null
          },
          data: {
            revokedAt: new Date(),
            revocationReason: "LOGOUT"
          }
        });
      }
    }

    dependencies.refreshTokenCookie.clear(res);

    return {
      status: 204,
      body: undefined
    };
  };
}
