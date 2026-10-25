import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import type { followBusinessContract } from "./follow-business.contract.js";

export function createFollowBusinessHandler({
  database
}: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof followBusinessContract> {
  return async ({ params, req, res }) => {
    res.setHeader("Cache-Control", "no-store");
    const userId = requireAuthenticatedPrincipal(req, "user").subjectId;
    const business = await database.business.findFirst({
      where: { id: params.businessId, status: "APPROVED" },
      select: { id: true }
    });
    if (!business) {
      throw new AppError({
        code: "business_not_found",
        message: "The business is not available.",
        statusCode: 404,
        title: "Business not found"
      });
    }
    // The composite primary key also prevents concurrent duplicate follows.
    await database.businessFollow.createMany({
      data: [{ userId, businessId: business.id }],
      skipDuplicates: true
    });
    return { status: 200, body: { businessId: business.id, following: true } };
  };
}
