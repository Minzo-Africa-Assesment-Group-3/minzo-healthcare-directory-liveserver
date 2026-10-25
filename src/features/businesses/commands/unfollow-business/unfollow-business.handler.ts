import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../shared/authentication/route-authentication.js";
import type { unfollowBusinessContract } from "./unfollow-business.contract.js";

export function createUnfollowBusinessHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof unfollowBusinessContract> {
  return async ({ params, req }) => {
    const userId = requireAuthenticatedPrincipal(req, "user").subjectId;

    await dependencies.database.businessFollow.deleteMany({
      where: {
        businessId: params.businessId,
        userId
      }
    });

    return {
      status: 200,
      body: { businessId: params.businessId, following: false }
    };
  };
}
