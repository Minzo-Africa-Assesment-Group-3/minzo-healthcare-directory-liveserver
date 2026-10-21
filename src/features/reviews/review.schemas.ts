import { z } from "zod";

export const reviewStarsSchema = z.number().int().min(1).max(5);

export const reviewTextSchema = z.string().trim().min(3).max(5_000);

export const publicReviewSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  stars: reviewStarsSchema,
  text: z.string(),
  isAnonymous: z.boolean(),
  mine: z.boolean(),
  author: z
    .object({
      displayName: z.string(),
    })
    .nullable(),
  submittedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const businessRatingSchema = z.object({
  businessId: z.string().uuid(),
  averageRating: z.number().min(1).max(5).nullable(),
  reviewCount: z.number().int().nonnegative(),
  ratingWindowMonths: z.literal(12),
});
