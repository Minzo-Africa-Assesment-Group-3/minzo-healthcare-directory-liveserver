import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import type { unfollowBusinessContract } from "./unfollow-business.contract.js";

export function createUnfollowBusinessHandler({
  database
}: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof unfollowBusinessContract> {
  return async ({ params, req, res }) => {
    res.setHeader("Cache-Control", "no-store");
    const userId = requireAuthenticatedPrincipal(req, "user").subjectId;
    await database.businessFollow.deleteMany({
      where: { userId, businessId: params.businessId }
    });
    return {
      status: 200,
      body: { businessId: params.businessId, following: false }
    };
  };
}
