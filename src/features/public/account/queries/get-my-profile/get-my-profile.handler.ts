import type { AppRouteQueryImplementation } from "@ts-rest/express";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { getUserAccountSummary } from "../../../../../shared/account/user-account-summary.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import type { getMyProfileContract } from "./get-my-profile.contract.js";

export function createGetMyProfileHandler({
  database
}: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof getMyProfileContract> {
  return async ({ req, res }) => {
    res.setHeader("Cache-Control", "no-store");
    const userId = requireAuthenticatedPrincipal(req, "user").subjectId;
    const user = await getUserAccountSummary(database, userId);
    if (!user) {
      throw new AppError({
        code: "account_unavailable",
        message: "The authenticated account is not available.",
        statusCode: 403,
        title: "Account unavailable"
      });
    }
    return {
      status: 200,
      body: user
    };
  };
}
