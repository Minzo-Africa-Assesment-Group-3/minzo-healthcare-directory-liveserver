import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { getPublicReviewCutoff } from "../../review.policy.js";
import { presentPublicReview } from "../../review.presenter.js";
import { publicReviewSelect } from "../../review.select.js";
import type { ReviewModerationQueue } from "../../../customer-feedback-moderation/services/review-moderation-queue.js";
import type { updateReviewContract } from "./update-review.contract.js";

export function createUpdateReviewHandler(dependencies: {
  database: DatabaseClient;
  moderationQueue: ReviewModerationQueue;
}): AppRouteMutationImplementation<typeof updateReviewContract> {
  return async ({ body, params, req }) => {
    const userId = requireAuthenticatedPrincipal(req, "user").subjectId;
    const existingReview = await dependencies.database.review.findUnique({
      where: { id: params.reviewId },
      select: {
        id: true,
        userId: true,
        status: true,
        submittedAt: true
      }
    });

    if (!existingReview || existingReview.status === "DELETED") {
      throw new AppError({
        code: "review_not_found",
        message: "The requested review does not exist.",
        statusCode: 404,
        title: "Review not found"
      });
    }

    if (existingReview.userId !== userId) {
      throw new AppError({
        code: "permission_denied",
        message: "You cannot update another user's review.",
        statusCode: 403,
        title: "Permission denied"
      });
    }

    if (existingReview.submittedAt < getPublicReviewCutoff()) {
      throw new AppError({
        code: "review_expired",
        message: "This review has expired. Submit a new review for the business instead.",
        statusCode: 409,
        title: "Review expired"
      });
    }

    const review = await dependencies.database.$transaction(async (transaction) => {
      const updatedReview = await transaction.review.update({
        where: { id: existingReview.id },
        data: {
          ...(body.stars !== undefined ? { stars: body.stars } : {}),
          ...(body.text !== undefined ? { text: body.text } : {}),
          ...(body.isAnonymous !== undefined ? { isAnonymous: body.isAnonymous } : {}),
          status: "PUBLISHED",
          moderationStatus: "UNREVIEWED"
        },
        select: publicReviewSelect
      });

      await dependencies.moderationQueue.enqueue(transaction, {
        reviewId: updatedReview.id,
        reviewUpdatedAt: updatedReview.updatedAt
      });

      return updatedReview;
    });

    return {
      status: 200,
      body: presentPublicReview(review, true)
    };
  };
}
