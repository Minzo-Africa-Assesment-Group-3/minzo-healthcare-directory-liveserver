import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { moderateCustomerFeedback } from "../../moderate-customer-feedback.js";
import type { ReviewRejectionNotificationQueue } from "../../services/review-rejection-notification-queue.js";
import type { moderateCustomerFeedbackAutomationContract } from "./moderate-customer-feedback-automation.contract.js";

export function createModerateCustomerFeedbackAutomationHandler(dependencies: {
  actorReference: string;
  database: DatabaseClient;
  reviewRejectionNotificationQueue: ReviewRejectionNotificationQueue;
}): AppRouteMutationImplementation<typeof moderateCustomerFeedbackAutomationContract> {
  return async ({ body, params }) => {
    const result = await moderateCustomerFeedback({
      actor: {
        type: "AUTOMATION",
        actorReference: dependencies.actorReference
      },
      database: dependencies.database,
      decision: body.decision,
      expectedReviewUpdatedAt: new Date(body.reviewUpdatedAt),
      reviewRejectionNotificationQueue: dependencies.reviewRejectionNotificationQueue,
      reviewId: params.reviewId,
      ...(body.reason !== undefined ? { reason: body.reason } : {})
    });

    return { status: 200, body: result };
  };
}
