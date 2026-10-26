import type { Prisma } from "../../../generated/prisma/client.js";

export const adminInvitationListSelect = {
  id: true,
  displayName: true,
  email: true,
  status: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
  createdAt: true,
  role: {
    select: {
      id: true,
      name: true
    }
  },
  invitedByAdmin: {
    select: {
      id: true,
      displayName: true,
      email: true
    }
  }
} satisfies Prisma.AdminInvitationSelect;

export type AdminInvitationListRecord = Prisma.AdminInvitationGetPayload<{
  select: typeof adminInvitationListSelect;
}>;
