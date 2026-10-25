import { z } from "zod";

export const moderatableBusinessStatusSchema = z.enum(["PENDING_APPROVAL", "APPROVED", "REJECTED"]);

const businessMemberSchema = z.object({
  role: z.enum(["OWNER", "MANAGER"]),
  user: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    email: z.string().email(),
    phone: z.string().nullable(),
    status: z.enum(["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "DEACTIVATED"])
  })
});

export const businessModerationListItemSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  legalName: z.string().nullable(),
  slug: z.string(),
  registrationNumber: z.string().nullable(),
  status: moderatableBusinessStatusSchema,
  verificationStatus: z.enum(["UNVERIFIED", "VERIFIED"]),
  submittedAt: z.string().datetime().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  hasRegistrationDocument: z.boolean(),
  primaryLocation: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      county: z.string().nullable(),
      cityOrTown: z.string().nullable()
    })
    .nullable(),
  members: z.array(businessMemberSchema)
});

const openingPeriodSchema = z.object({
  id: z.string().uuid(),
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  opensAt: z.string(),
  closesAt: z.string(),
  closesNextDay: z.boolean()
});

export const businessModerationDetailSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  legalName: z.string().nullable(),
  slug: z.string(),
  registrationNumber: z.string().nullable(),
  source: z.literal("SELF_REGISTERED"),
  status: moderatableBusinessStatusSchema,
  verificationStatus: z.enum(["UNVERIFIED", "VERIFIED"]),
  submittedAt: z.string().datetime().nullable(),
  approvedAt: z.string().datetime().nullable(),
  rejectedAt: z.string().datetime().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  reviewedByAdminId: z.string().uuid().nullable(),
  reviewNote: z.string().nullable(),
  registrationDocument: z
    .object({
      id: z.string().uuid(),
      originalFileName: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number().int().positive(),
      uploadedAt: z.string().datetime(),
      downloadUrl: z.string().url(),
      downloadExpiresAt: z.string().datetime()
    })
    .nullable(),
  members: z.array(businessMemberSchema),
  locations: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      slug: z.string(),
      status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]),
      isPrimary: z.boolean(),
      facilityType: z.string().nullable(),
      contactEmail: z.string().nullable(),
      contactPhone: z.string().nullable(),
      websiteUrl: z.string().nullable(),
      description: z.string().nullable(),
      addressLine: z.string().nullable(),
      county: z.string().nullable(),
      cityOrTown: z.string().nullable(),
      latitude: z.number().nullable(),
      longitude: z.number().nullable(),
      timezone: z.string(),
      openingPeriods: z.array(openingPeriodSchema),
      services: z.array(
        z.object({
          id: z.string().uuid(),
          name: z.string(),
          slug: z.string()
        })
      ),
      staffMembers: z.array(
        z.object({
          id: z.string().uuid(),
          displayName: z.string(),
          profession: z.string(),
          professionalTitle: z.string().nullable(),
          phone: z.string().nullable(),
          email: z.string().nullable(),
          yearsExperience: z.number().int().nonnegative().nullable(),
          isPublic: z.boolean(),
          verificationStatus: z.enum(["UNVERIFIED", "VERIFIED"])
        })
      )
    })
  )
});
