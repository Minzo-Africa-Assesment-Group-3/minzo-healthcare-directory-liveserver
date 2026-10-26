import type { AdminInvitationListRecord } from "./admin-invitation.select.js";

export function presentAdminInvitation(invitation: AdminInvitationListRecord) {
  return {
    id: invitation.id,
    displayName: invitation.displayName,
    email: invitation.email,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    revokedAt: invitation.revokedAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
    role: invitation.role,
    invitedBy: invitation.invitedByAdmin
  };
}
