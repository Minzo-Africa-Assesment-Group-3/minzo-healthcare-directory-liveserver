import { z } from "zod";

import type { DatabaseClient } from "../../infrastructure/database/index.js";

export const businessMembershipSummarySchema = z.object({
  role: z.enum(["OWNER", "MANAGER"]),
  business: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    legalName: z.string().nullable(),
    slug: z.string(),
    status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "SUSPENDED"]),
    verificationStatus: z.enum(["UNVERIFIED", "VERIFIED"])
  })
});

export const userAccountSummarySchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  status: z.enum(["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "DEACTIVATED"]),
  emailVerifiedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  accountType: z.enum(["INDIVIDUAL", "BUSINESS"]),
  businesses: z.array(businessMembershipSummarySchema)
});

export async function getUserAccountSummary(database: DatabaseClient, userId: string) {
  const user = await database.user.findUnique({
    where: { id: userId, status: "ACTIVE", deletedAt: null },
    select: {
      id: true,
      displayName: true,
      email: true,
      phone: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      businessMemberships: {
        select: {
          role: true,
          business: {
            select: {
              id: true,
              displayName: true,
              legalName: true,
              slug: true,
              status: true,
              verificationStatus: true
            }
          }
        }
      }
    }
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    accountType: user.businessMemberships.length ? ("BUSINESS" as const) : ("INDIVIDUAL" as const),
    businesses: user.businessMemberships
  };
}
