import type { CustomerFeedbackModerationListRecord } from "./customer-feedback-moderation.select.js";

export function presentCustomerFeedbackModerationListItem(feedback: CustomerFeedbackModerationListRecord) {
  const lastModeration = feedback.moderationActions[0];

  return {
    id: feedback.id,
    business: feedback.business,
    author: feedback.author,
    stars: feedback.stars,
    text: feedback.text,
    isAnonymous: feedback.isAnonymous,
    publicationStatus: feedback.status as "PUBLISHED" | "HIDDEN",
    moderationStatus: feedback.moderationStatus,
    submittedAt: feedback.submittedAt.toISOString(),
    updatedAt: feedback.updatedAt.toISOString(),
    lastModeration: lastModeration
      ? {
          ...lastModeration,
          createdAt: lastModeration.createdAt.toISOString(),
          moderatedBy: lastModeration.actorType === "ADMIN" ? ("MINZO_ADMIN" as const) : ("AI" as const)
        }
      : null
  };
}
