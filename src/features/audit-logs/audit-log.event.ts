import type { Prisma } from "../../generated/prisma/client.js";

export type AuditLogActor =
  { type: "ADMIN"; adminUserId: string } | { type: "AUTOMATION"; actorReference: string };

export type AuditLogEvent = {
  actor: AuditLogActor;
  action: "business.claim.approved" | "business.claim.rejected" | "customer_review.moderated";
  entity: {
    id: string;
    type: "BUSINESS_CLAIM" | "CUSTOMER_REVIEW";
  };
  metadata?: Prisma.InputJsonValue;
};
