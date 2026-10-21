import type { Prisma } from "../../../../generated/prisma/client.js";

export const managedBusinessFeedbackSelect = {
  id: true,
  businessId: true,
  stars: true,
  text: true,
  isAnonymous: true,
  status: true,
  moderationStatus: true,
  submittedAt: true,
  updatedAt: true,
  author: {
    select: { displayName: true },
  },
  moderationActions: {
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1,
    select: {
      decision: true,
      reason: true,
      createdAt: true,
    },
  },
} satisfies Prisma.ReviewSelect;

export type ManagedBusinessFeedbackRecord = Prisma.ReviewGetPayload<{
  select: typeof managedBusinessFeedbackSelect;
}>;
