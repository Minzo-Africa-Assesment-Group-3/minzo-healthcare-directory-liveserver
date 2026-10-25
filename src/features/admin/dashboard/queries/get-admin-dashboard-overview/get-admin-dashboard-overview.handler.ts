import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { requireAdminDashboardViewer } from "../../admin-dashboard.authorization.js";
import type { getAdminDashboardOverviewContract } from "./get-admin-dashboard-overview.contract.js";

export function createGetAdminDashboardOverviewHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof getAdminDashboardOverviewContract> {
  return async ({ req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;

    await requireAdminDashboardViewer({
      adminUserId,
      database: dependencies.database
    });

    const [
      businessesTotal,
      businessesApproved,
      businessesPendingApproval,
      businessesRejected,
      businessesUnclaimed,
      claimsPending,
      claimsApproved,
      claimsRejected,
      reviewsPublished,
      reviewsUnreviewed,
      reviewsFlagged,
      reviewsRejected,
      usersTotal,
      usersPendingEmailVerification,
      usersActive
    ] = await dependencies.database.$transaction([
      dependencies.database.business.count(),
      dependencies.database.business.count({ where: { status: "APPROVED" } }),
      dependencies.database.business.count({
        where: { status: "PENDING_APPROVAL" }
      }),
      dependencies.database.business.count({ where: { status: "REJECTED" } }),
      dependencies.database.business.count({
        where: { memberships: { none: {} } }
      }),
      dependencies.database.businessClaim.count({ where: { status: "PENDING" } }),
      dependencies.database.businessClaim.count({ where: { status: "APPROVED" } }),
      dependencies.database.businessClaim.count({ where: { status: "REJECTED" } }),
      dependencies.database.review.count({ where: { status: "PUBLISHED" } }),
      dependencies.database.review.count({
        where: {
          moderationStatus: "UNREVIEWED",
          status: "PUBLISHED"
        }
      }),
      dependencies.database.review.count({
        where: {
          moderationStatus: "FLAGGED",
          status: "PUBLISHED"
        }
      }),
      dependencies.database.review.count({
        where: { moderationStatus: "REJECTED" }
      }),
      dependencies.database.user.count({ where: { deletedAt: null } }),
      dependencies.database.user.count({
        where: {
          deletedAt: null,
          status: "PENDING_VERIFICATION"
        }
      }),
      dependencies.database.user.count({
        where: {
          deletedAt: null,
          status: "ACTIVE"
        }
      })
    ]);

    return {
      status: 200,
      body: {
        businesses: {
          total: businessesTotal,
          approved: businessesApproved,
          pendingApproval: businessesPendingApproval,
          rejected: businessesRejected,
          unclaimed: businessesUnclaimed
        },
        claims: {
          pending: claimsPending,
          approved: claimsApproved,
          rejected: claimsRejected
        },
        reviews: {
          published: reviewsPublished,
          unreviewed: reviewsUnreviewed,
          flagged: reviewsFlagged,
          rejected: reviewsRejected
        },
        users: {
          total: usersTotal,
          pendingEmailVerification: usersPendingEmailVerification,
          active: usersActive
        }
      }
    };
  };
}
