import type { Prisma } from "../../../generated/prisma/client.js";

export type AuditLogActor =
  { type: "ADMIN"; adminUserId: string } | { type: "AUTOMATION"; actorReference: string };

export type AuditLogEvent = {
  actor: AuditLogActor;
  action:
    | "business.registration.approved"
    | "business.registration.rejected"
    | "business.claim.approved"
    | "business.claim.rejected"
    | "business.media_batch.reviewed"
    | "customer_review.moderated"
    | "admin.invited"
    | "admin.invitation.accepted";
  entity: {
    id: string;
    type: "BUSINESS" | "BUSINESS_CLAIM" | "BUSINESS_MEDIA_BATCH" | "CUSTOMER_REVIEW" | "ADMIN_INVITATION" | "ADMIN_USER";
  };
  metadata?: Prisma.InputJsonValue;
};
