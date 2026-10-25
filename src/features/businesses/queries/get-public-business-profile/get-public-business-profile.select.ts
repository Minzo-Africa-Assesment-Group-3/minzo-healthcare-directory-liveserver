import type { Prisma } from "../../../../generated/prisma/client.js";

export const publicBusinessProfileSelect = {
  id: true,
  displayName: true,
  legalName: true,
  slug: true,
  verificationStatus: true,
  approvedAt: true,
  _count: {
    select: { memberships: true }
  },
  media: {
    where: { status: "APPROVED" },
    orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      bucket: true,
      objectKey: true,
      altText: true,
      isCover: true,
      sortOrder: true
    }
  },
  locations: {
    where: { status: "ACTIVE" },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
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
      isPrimary: true,
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
        orderBy: {
          service: { name: "asc" }
        },
        select: {
          service: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      },
      staffMembers: {
        where: { isPublic: true },
        orderBy: [{ displayName: "asc" }, { id: "asc" }],
        select: {
          id: true,
          displayName: true,
          profession: true,
          professionalTitle: true,
          yearsExperience: true,
          verificationStatus: true
        }
      }
    }
  }
} satisfies Prisma.BusinessSelect;

export type PublicBusinessProfileRecord = Prisma.BusinessGetPayload<{
  select: typeof publicBusinessProfileSelect;
}>;
