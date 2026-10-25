import type { Prisma } from "../../../generated/prisma/client.js";

export const businessClaimSelect = {
  id: true,
  requestedRole: true,
  status: true,
  claimantNote: true,
  evidenceDocumentOriginalName: true,
  evidenceDocumentMimeType: true,
  evidenceDocumentSizeBytes: true,
  reviewedByAdminId: true,
  reviewedAt: true,
  reviewNote: true,
  createdAt: true,
  business: {
    select: {
      id: true,
      displayName: true,
      slug: true
    }
  }
} satisfies Prisma.BusinessClaimSelect;

export const adminBusinessClaimSelect = {
  ...businessClaimSelect,
  claimantUser: {
    select: {
      id: true,
      displayName: true,
      email: true,
      phone: true
    }
  }
} satisfies Prisma.BusinessClaimSelect;
