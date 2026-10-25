import type { ManagedBusinessFeedbackRecord } from "./list-managed-business-feedback.select.js";

export function presentManagedBusinessFeedback(feedback: ManagedBusinessFeedbackRecord) {
  const lastModeration = feedback.moderationActions[0];

  return {
    id: feedback.id,
    businessId: feedback.businessId,
    stars: feedback.stars,
    text: feedback.text,
    isAnonymous: feedback.isAnonymous,
    author: feedback.isAnonymous ? null : feedback.author,
    publicationStatus: feedback.status as "PUBLISHED" | "HIDDEN",
    moderationStatus: feedback.moderationStatus,
    submittedAt: feedback.submittedAt.toISOString(),
    updatedAt: feedback.updatedAt.toISOString(),
    lastModeration: lastModeration
      ? {
          ...lastModeration,
          createdAt: lastModeration.createdAt.toISOString()
        }
      : null
  };
}
