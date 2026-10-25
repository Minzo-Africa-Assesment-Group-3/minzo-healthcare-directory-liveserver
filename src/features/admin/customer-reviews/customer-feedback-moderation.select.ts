import type { Prisma } from "../../../generated/prisma/client.js";

export const customerFeedbackModerationListSelect = {
  id: true,
  stars: true,
  text: true,
  isAnonymous: true,
  status: true,
  moderationStatus: true,
  submittedAt: true,
  updatedAt: true,
  business: {
    select: {
      id: true,
      displayName: true,
      slug: true
    }
  },
  author: {
    select: {
      id: true,
      displayName: true,
      email: true
    }
  },
  moderationActions: {
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1,
    select: {
      id: true,
      actorType: true,
      decision: true,
      adminUserId: true,
      actorReference: true,
      reason: true,
      createdAt: true
    }
  }
} satisfies Prisma.ReviewSelect;

export type CustomerFeedbackModerationListRecord = Prisma.ReviewGetPayload<{
  select: typeof customerFeedbackModerationListSelect;
}>;
