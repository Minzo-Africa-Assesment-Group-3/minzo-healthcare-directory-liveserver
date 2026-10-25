import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import type { followBusinessContract } from "./follow-business.contract.js";

export function createFollowBusinessHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof followBusinessContract> {
  return async ({ params, req }) => {
    const userId = requireAuthenticatedPrincipal(req, "user").subjectId;
    const business = await dependencies.database.business.findFirst({
      where: { id: params.businessId, status: "APPROVED" },
      select: { id: true }
    });

    if (!business) {
      throw new AppError({
        code: "business_not_found",
        message: "The requested business does not exist.",
        statusCode: 404,
        title: "Business not found"
      });
    }

    await dependencies.database.businessFollow.upsert({
      where: {
        userId_businessId: {
          businessId: business.id,
          userId
        }
      },
      create: { businessId: business.id, userId },
      update: {}
    });

    return {
      status: 200,
      body: { businessId: business.id, following: true }
    };
  };
}
