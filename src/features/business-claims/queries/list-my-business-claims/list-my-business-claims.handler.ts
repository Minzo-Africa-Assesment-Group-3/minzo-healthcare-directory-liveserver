import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../shared/authentication/route-authentication.js";
import { presentBusinessClaim } from "../../business-claim.presenter.js";
import { businessClaimSelect } from "../../business-claim.select.js";
import type { listMyBusinessClaimsContract } from "./list-my-business-claims.contract.js";

export function createListMyBusinessClaimsHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof listMyBusinessClaimsContract> {
  return async ({ req }) => {
    const claimantUserId =
      requireAuthenticatedPrincipal(req, "user").subjectId;
    const claims = await dependencies.database.businessClaim.findMany({
      where: { claimantUserId },
      orderBy: { createdAt: "desc" },
      select: businessClaimSelect,
    });

    return {
      status: 200,
      body: {
        data: claims.map(presentBusinessClaim),
      },
    };
  };
}
