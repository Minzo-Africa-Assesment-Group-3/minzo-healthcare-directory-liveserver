interface BusinessClaimRecord {
  id: string;
  requestedRole: "OWNER" | "MANAGER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  claimantNote: string | null;
  evidenceDocumentOriginalName: string;
  evidenceDocumentMimeType: string;
  evidenceDocumentSizeBytes: number;
  reviewedByAdminId: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
  business: {
    id: string;
    displayName: string;
    slug: string;
  };
}

interface AdminBusinessClaimRecord extends BusinessClaimRecord {
  claimantUser: {
    id: string;
    displayName: string;
    email: string;
    phone: string | null;
  };
}

export function presentBusinessClaim(claim: BusinessClaimRecord) {
  return {
    id: claim.id,
    business: claim.business,
    requestedRole: claim.requestedRole,
    status: claim.status,
    claimantNote: claim.claimantNote,
    evidenceDocument: {
      originalFileName: claim.evidenceDocumentOriginalName,
      mimeType: claim.evidenceDocumentMimeType,
      sizeBytes: claim.evidenceDocumentSizeBytes,
    },
    reviewNote: claim.reviewNote,
    reviewedAt: claim.reviewedAt?.toISOString() ?? null,
    createdAt: claim.createdAt.toISOString(),
  };
}

export function presentAdminBusinessClaim(claim: AdminBusinessClaimRecord) {
  return {
    ...presentBusinessClaim(claim),
    claimant: claim.claimantUser,
    reviewedByAdminId: claim.reviewedByAdminId,
  };
}
