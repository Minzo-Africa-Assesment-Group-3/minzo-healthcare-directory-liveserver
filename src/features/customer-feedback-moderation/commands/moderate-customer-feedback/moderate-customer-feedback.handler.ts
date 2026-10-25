import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../shared/authentication/route-authentication.js";
import { requireCustomerFeedbackModerator } from "../../customer-feedback-moderation.authorization.js";
import { moderateCustomerFeedback } from "../../moderate-customer-feedback.js";
import type { ReviewRejectionNotificationQueue } from "../../services/review-rejection-notification-queue.js";
import type { moderateCustomerFeedbackContract } from "./moderate-customer-feedback.contract.js";

export function createModerateCustomerFeedbackHandler(dependencies: {
  database: DatabaseClient;
  reviewRejectionNotificationQueue: ReviewRejectionNotificationQueue;
}): AppRouteMutationImplementation<typeof moderateCustomerFeedbackContract> {
  return async ({ body, params, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireCustomerFeedbackModerator({
      adminUserId,
      database: dependencies.database
    });

    const result = await moderateCustomerFeedback({
      actor: { type: "ADMIN", adminUserId },
      database: dependencies.database,
      decision: body.decision,
      reviewRejectionNotificationQueue: dependencies.reviewRejectionNotificationQueue,
      reviewId: params.reviewId,
      ...(body.reason !== undefined ? { reason: body.reason } : {})
    });

    return { status: 200, body: result };
  };
}
