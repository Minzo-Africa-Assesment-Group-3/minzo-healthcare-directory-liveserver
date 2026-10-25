import type { Prisma } from "../../generated/prisma/client.js";

export const publicReviewSelect = {
  id: true,
  businessId: true,
  stars: true,
  text: true,
  isAnonymous: true,
  submittedAt: true,
  updatedAt: true,
  author: {
    select: {
      displayName: true
    }
  }
} satisfies Prisma.ReviewSelect;
