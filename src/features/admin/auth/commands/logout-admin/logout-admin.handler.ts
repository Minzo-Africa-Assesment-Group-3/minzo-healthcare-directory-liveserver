import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { hashRefreshToken, type RefreshTokenCookieService } from "../../../../../shared/authentication/index.js";
import type { logoutAdminContract } from "./logout-admin.contract.js";

export function createLogoutAdminHandler(dependencies: {
  database: DatabaseClient;
  refreshTokenCookie: RefreshTokenCookieService;
}): AppRouteMutationImplementation<typeof logoutAdminContract> {
  return async ({ req, res }) => {
    const rawToken = dependencies.refreshTokenCookie.read(req);

    if (rawToken) {
      const storedToken = await dependencies.database.adminRefreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(rawToken) },
        select: { familyId: true }
      });

      if (storedToken) {
        await dependencies.database.adminRefreshToken.updateMany({
          where: { familyId: storedToken.familyId, revokedAt: null },
          data: { revokedAt: new Date(), revocationReason: "LOGOUT" }
        });
      }
    }

    dependencies.refreshTokenCookie.clear(res);

    return { status: 204, body: undefined };
  };
}
