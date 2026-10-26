import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { requireBusinessClaimsAdmin } from "../../business-claim.authorization.js";
import { presentAdminBusinessClaim } from "../../business-claim.presenter.js";
import { adminBusinessClaimSelect } from "../../business-claim.select.js";
import type { getBusinessClaimContract } from "./get-business-claim.contract.js";

export function createGetBusinessClaimHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof getBusinessClaimContract> {
  return async ({ params, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireBusinessClaimsAdmin({
      adminUserId,
      database: dependencies.database
    });

    const claim = await dependencies.database.businessClaim.findUnique({
      where: { id: params.claimId },
      select: adminBusinessClaimSelect
    });

    if (!claim) {
      throw new AppError({
        code: "business_claim_not_found",
        message: "The requested business claim does not exist.",
        statusCode: 404,
        title: "Business claim not found"
      });
    }

    return {
      status: 200,
      body: presentAdminBusinessClaim(claim)
    };
  };
}
