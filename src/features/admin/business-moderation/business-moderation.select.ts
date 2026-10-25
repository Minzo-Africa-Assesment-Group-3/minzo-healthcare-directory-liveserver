import type { Prisma } from "../../../generated/prisma/client.js";

const memberSelect = {
  role: true,
  user: {
    select: {
      id: true,
      displayName: true,
      email: true,
      phone: true,
      status: true
    }
  }
} satisfies Prisma.BusinessMembershipSelect;

export const businessModerationListSelect = {
  id: true,
  displayName: true,
  legalName: true,
  slug: true,
  registrationNumber: true,
  status: true,
  verificationStatus: true,
  submittedAt: true,
  reviewedAt: true,
  registrationDocumentKey: true,
  memberships: {
    orderBy: { createdAt: "asc" },
    select: memberSelect
  },
  locations: {
    where: { isPrimary: true },
    take: 1,
    select: {
      id: true,
      name: true,
      county: true,
      cityOrTown: true
    }
  }
} satisfies Prisma.BusinessSelect;

export const businessModerationDetailSelect = {
  id: true,
  displayName: true,
  legalName: true,
  slug: true,
  registrationNumber: true,
  source: true,
  status: true,
  verificationStatus: true,
  submittedAt: true,
  approvedAt: true,
  rejectedAt: true,
  reviewedAt: true,
  reviewedByAdminId: true,
  reviewNote: true,
  memberships: {
    orderBy: { createdAt: "asc" },
    select: memberSelect
  },
  registrationDocuments: {
    where: { status: "ATTACHED" },
    orderBy: { attachedAt: "desc" },
    take: 1,
    select: {
      id: true,
      bucket: true,
      objectKey: true,
      originalFileName: true,
      verifiedMimeType: true,
      verifiedSizeBytes: true,
      uploadedAt: true
    }
  },
  locations: {
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      isPrimary: true,
      facilityType: true,
      contactEmail: true,
      contactPhone: true,
      websiteUrl: true,
      description: true,
      addressLine: true,
      county: true,
      cityOrTown: true,
      latitude: true,
      longitude: true,
      timezone: true,
      openingPeriods: {
        orderBy: [{ dayOfWeek: "asc" }, { opensAtMinutes: "asc" }],
        select: {
          id: true,
          dayOfWeek: true,
          opensAtMinutes: true,
          closesAtMinutes: true,
          closesNextDay: true
        }
      },
      services: {
        orderBy: { service: { name: "asc" } },
        select: {
          service: { select: { id: true, name: true, slug: true } }
        }
      },
      staffMembers: {
        orderBy: [{ displayName: "asc" }, { id: "asc" }],
        select: {
          id: true,
          displayName: true,
          profession: true,
          professionalTitle: true,
          phone: true,
          email: true,
          yearsExperience: true,
          isPublic: true,
          verificationStatus: true
        }
      }
    }
  }
} satisfies Prisma.BusinessSelect;

export type BusinessModerationListRecord = Prisma.BusinessGetPayload<{
  select: typeof businessModerationListSelect;
}>;

export type BusinessModerationDetailRecord = Prisma.BusinessGetPayload<{
  select: typeof businessModerationDetailSelect;
}>;
