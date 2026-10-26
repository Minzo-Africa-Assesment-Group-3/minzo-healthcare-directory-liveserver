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
    | "admin.invitation.accepted"
    | "admin.invitation.revoked"
    | "admin.role.created"
    | "admin.role.permissions_synced"
    | "admin.user.roles_synced"
    | "directory.county.created"
    | "directory.county.updated"
    | "directory.city.created"
    | "directory.city.updated";
  entity: {
    id: string;
    type:
      | "BUSINESS"
      | "BUSINESS_CLAIM"
      | "BUSINESS_MEDIA_BATCH"
      | "CUSTOMER_REVIEW"
      | "ADMIN_INVITATION"
      | "ADMIN_ROLE"
      | "ADMIN_USER"
      | "COUNTY"
      | "CITY";
  };
  metadata?: Prisma.InputJsonValue;
};
