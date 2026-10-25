import { z } from "zod";

export const customerFeedbackModerationStatusSchema = z.enum([
  "UNREVIEWED",
  "APPROVED",
  "FLAGGED",
  "REJECTED"
]);

export const customerFeedbackModerationActorTypeSchema = z.enum(["ADMIN", "AUTOMATION"]);

export const customerFeedbackModerationDecisionSchema = z.enum(["APPROVED", "FLAGGED", "REJECTED"]);

const moderationActionSchema = z.object({
  id: z.string().uuid(),
  actorType: customerFeedbackModerationActorTypeSchema,
  decision: customerFeedbackModerationDecisionSchema,
  adminUserId: z.string().uuid().nullable(),
  actorReference: z.string().nullable(),
  reason: z.string().nullable(),
  createdAt: z.string().datetime(),
  moderatedBy: z.enum(["MINZO_ADMIN", "AI"])
});

export const customerFeedbackModerationListItemSchema = z.object({
  id: z.string().uuid(),
  business: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    slug: z.string()
  }),
  author: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    email: z.string().email()
  }),
  stars: z.number().int().min(1).max(5),
  text: z.string(),
  isAnonymous: z.boolean(),
  publicationStatus: z.enum(["PUBLISHED", "HIDDEN"]),
  moderationStatus: customerFeedbackModerationStatusSchema,
  submittedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastModeration: moderationActionSchema.nullable()
});

export const customerFeedbackModerationResultSchema = z.object({
  reviewId: z.string().uuid(),
  publicationStatus: z.enum(["PUBLISHED", "HIDDEN"]),
  moderationStatus: customerFeedbackModerationStatusSchema,
  moderation: moderationActionSchema
});
