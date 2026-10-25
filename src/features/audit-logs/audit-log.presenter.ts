interface AuditLogRecord {
  id: string;
  actorType: "ADMIN" | "AUTOMATION";
  actorReference: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
  actorAdmin: {
    id: string;
    displayName: string;
    email: string;
  } | null;
}

export function presentAuditLog(record: AuditLogRecord) {
  return {
    id: record.id,
    actor: {
      type: record.actorType,
      admin: record.actorAdmin,
      reference: record.actorReference
    },
    action: record.action,
    entity: {
      type: record.entityType,
      id: record.entityId
    },
    metadata: record.metadata,
    createdAt: record.createdAt.toISOString()
  };
}
