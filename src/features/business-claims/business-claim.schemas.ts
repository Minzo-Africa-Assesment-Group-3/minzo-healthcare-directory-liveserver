import { z } from "zod";

export const businessClaimStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const businessMembershipRoleSchema = z.enum(["OWNER", "MANAGER"]);

export const businessClaimResponseSchema = z.object({
  id: z.string().uuid(),
  business: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    slug: z.string()
  }),
  requestedRole: businessMembershipRoleSchema,
  status: businessClaimStatusSchema,
  claimantNote: z.string().nullable(),
  evidenceDocument: z.object({
    originalFileName: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number().int().positive()
  }),
  reviewNote: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime()
});

export const adminBusinessClaimResponseSchema = businessClaimResponseSchema.extend({
  claimant: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    email: z.string().email(),
    phone: z.string().nullable()
  }),
  reviewedByAdminId: z.string().uuid().nullable()
});
