import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { requirePublicBusiness } from "../../review.authorization.js";
import { getRatingCutoff, RATING_WINDOW_MONTHS } from "../../review.policy.js";
import type { getBusinessRatingContract } from "./get-business-rating.contract.js";

export function createGetBusinessRatingHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof getBusinessRatingContract> {
  return async ({ params }) => {
    await requirePublicBusiness(dependencies.database, params.businessId);

    const rating = await dependencies.database.review.aggregate({
      where: {
        businessId: params.businessId,
        status: "PUBLISHED",
        submittedAt: { gte: getRatingCutoff() }
      },
      _avg: { stars: true },
      _count: { _all: true }
    });
    const rawAverage = rating._avg.stars;

    return {
      status: 200,
      body: {
        businessId: params.businessId,
        averageRating: rawAverage === null ? null : Math.round(rawAverage * 100) / 100,
        reviewCount: rating._count._all,
        ratingWindowMonths: RATING_WINDOW_MONTHS
      }
    };
  };
}
