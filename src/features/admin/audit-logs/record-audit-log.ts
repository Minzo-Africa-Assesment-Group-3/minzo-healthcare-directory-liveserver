import type { Prisma } from "../../../generated/prisma/client.js";

import type { AuditLogEvent } from "./audit-log.event.js";

/**
 * Records one semantic business event using the caller's Prisma transaction.
 * The domain mutation and audit record therefore commit or roll back together.
 */
export async function recordAuditLog(
  transaction: Prisma.TransactionClient,
  event: AuditLogEvent
): Promise<void> {
  await transaction.auditLog.create({
    data: {
      actorType: event.actor.type,
      actorAdminId: event.actor.type === "ADMIN" ? event.actor.adminUserId : null,
      actorReference: event.actor.type === "AUTOMATION" ? event.actor.actorReference : null,
      action: event.action,
      entityType: event.entity.type,
      entityId: event.entity.id,
      ...(event.metadata === undefined ? {} : { metadata: event.metadata })
    }
  });
}
