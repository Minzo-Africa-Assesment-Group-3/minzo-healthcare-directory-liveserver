export const auditLogSelect = {
  id: true,
  actorType: true,
  actorReference: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  createdAt: true,
  actorAdmin: {
    select: {
      id: true,
      displayName: true,
      email: true
    }
  }
} as const;
