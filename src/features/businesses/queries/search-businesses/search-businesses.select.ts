import type { Prisma } from "../../../../generated/prisma/client.js";

export const businessSearchResultSelect = {
  id: true,
  displayName: true,
  slug: true,
  verificationStatus: true,
  _count: {
    select: { memberships: true }
  },
  locations: {
    where: { status: "ACTIVE" },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      facilityType: true,
      addressLine: true,
      county: true,
      cityOrTown: true,
      latitude: true,
      longitude: true,
      isPrimary: true,
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
      }
    }
  }
} satisfies Prisma.BusinessSelect;

export type BusinessSearchResultRecord = Prisma.BusinessGetPayload<{
  select: typeof businessSearchResultSelect;
}>;
