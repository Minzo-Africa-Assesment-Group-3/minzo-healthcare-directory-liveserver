import type { DatabaseClient } from "../../../infrastructure/database/index.js";

const ACTIVITY_LIMIT = 8;

export type DashboardActivity = {
  action: string | null;
  entity: {
    id: string;
    name: string | null;
    type: string;
  };
  id: string;
  occurredAt: string;
  type:
    | "ADMIN_ACTION"
    | "BUSINESS_CLAIM_SUBMITTED"
    | "BUSINESS_REGISTRATION_SUBMITTED"
    | "CUSTOMER_REVIEW_SUBMITTED";
};

export async function getRecentDashboardActivities(
  database: DatabaseClient
): Promise<DashboardActivity[]> {
  const [registrations, claims, reviews, auditLogs] = await Promise.all([
    database.business.findMany({
      where: {
        source: "SELF_REGISTERED",
        submittedAt: { not: null }
      },
      orderBy: { submittedAt: "desc" },
      take: ACTIVITY_LIMIT,
      select: {
        id: true,
        displayName: true,
        submittedAt: true
      }
    }),
    database.businessClaim.findMany({
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_LIMIT,
      select: {
        id: true,
        createdAt: true,
        business: {
          select: {
            id: true,
            displayName: true
          }
        }
      }
    }),
    database.review.findMany({
      where: { status: { not: "DELETED" } },
      orderBy: { submittedAt: "desc" },
      take: ACTIVITY_LIMIT,
      select: {
        id: true,
        submittedAt: true,
        business: {
          select: {
            id: true,
            displayName: true
          }
        }
      }
    }),
    database.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_LIMIT,
      select: {
        id: true,
        action: true,
        entityId: true,
        entityType: true,
        createdAt: true
      }
    })
  ]);

  return [
    ...registrations.map((registration) => ({
      id: `business-registration:${registration.id}`,
      type: "BUSINESS_REGISTRATION_SUBMITTED" as const,
      action: null,
      occurredAt: registration.submittedAt!.toISOString(),
      entity: {
        id: registration.id,
        name: registration.displayName,
        type: "BUSINESS"
      }
    })),
    ...claims.map((claim) => ({
      id: `business-claim:${claim.id}`,
      type: "BUSINESS_CLAIM_SUBMITTED" as const,
      action: null,
      occurredAt: claim.createdAt.toISOString(),
      entity: {
        id: claim.id,
        name: claim.business.displayName,
        type: "BUSINESS_CLAIM"
      }
    })),
    ...reviews.map((review) => ({
      id: `customer-review:${review.id}`,
      type: "CUSTOMER_REVIEW_SUBMITTED" as const,
      action: null,
      occurredAt: review.submittedAt.toISOString(),
      entity: {
        id: review.id,
        name: review.business.displayName,
        type: "CUSTOMER_REVIEW"
      }
    })),
    ...auditLogs.map((auditLog) => ({
      id: `audit-log:${auditLog.id}`,
      type: "ADMIN_ACTION" as const,
      action: auditLog.action,
      occurredAt: auditLog.createdAt.toISOString(),
      entity: {
        id: auditLog.entityId,
        name: null,
        type: auditLog.entityType
      }
    }))
  ]
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .slice(0, ACTIVITY_LIMIT);
}
