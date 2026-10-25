import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { requireBusinessOwnerOrManager } from "../../business-ownership.authorization.js";
import type { getBusinessOwnerDashboardOverviewContract } from "./get-business-owner-dashboard-overview.contract.js";

export function createGetBusinessOwnerDashboardOverviewHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof getBusinessOwnerDashboardOverviewContract> {
  return async ({ params, req }) => {
    const userId = requireAuthenticatedPrincipal(req, "user").subjectId;
    await requireBusinessOwnerOrManager({
      businessId: params.businessId,
      database: dependencies.database,
      userId
    });

    const [
      business,
      followers,
      reviewRating,
      unreadMessages,
      locationsTotal,
      locationsActive,
      staffTotal,
      pendingMedia
    ] = await dependencies.database.$transaction([
      dependencies.database.business.findUnique({
        where: { id: params.businessId },
        select: {
          id: true,
          displayName: true,
          status: true,
          verificationStatus: true
        }
      }),
      dependencies.database.businessFollow.count({
        where: { businessId: params.businessId }
      }),
      dependencies.database.review.aggregate({
        where: {
          businessId: params.businessId,
          status: "PUBLISHED"
        },
        _avg: { stars: true },
        _count: { _all: true }
      }),
      dependencies.database.businessContactMessage.count({
        where: { businessId: params.businessId, status: "UNREAD" }
      }),
      dependencies.database.businessLocation.count({
        where: { businessId: params.businessId }
      }),
      dependencies.database.businessLocation.count({
        where: { businessId: params.businessId, status: "ACTIVE" }
      }),
      dependencies.database.businessStaffMember.count({
        where: { businessLocation: { businessId: params.businessId } }
      }),
      dependencies.database.businessMedia.count({
        where: {
          businessId: params.businessId,
          status: "PENDING_REVIEW"
        }
      })
    ]);

    if (!business) {
      throw new AppError({
        code: "business_not_found",
        message: "The requested business does not exist.",
        statusCode: 404,
        title: "Business not found"
      });
    }

    const rawAverageRating = reviewRating._avg.stars;

    return {
      status: 200,
      body: {
        business,
        followers: { total: followers },
        reviews: {
          total: reviewRating._count._all,
          averageRating: rawAverageRating === null ? null : Math.round(rawAverageRating * 100) / 100
        },
        messages: { unread: unreadMessages },
        locations: { total: locationsTotal, active: locationsActive },
        staff: { total: staffTotal },
        gallery: { pendingReview: pendingMedia }
      }
    };
  };
}
