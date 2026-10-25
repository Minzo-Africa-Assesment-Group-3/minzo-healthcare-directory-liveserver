import type { PgBoss } from "pg-boss";
import type { Logger } from "pino";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import type { AiReviewModerationClient } from "./ai-review-moderation-client.js";
import { reviewModerationQueueName, type ReviewModerationTask } from "./review-moderation-queue.js";

export interface ReviewModerationWorker {
  start(): Promise<void>;
}

export function createReviewModerationWorker(options: {
  aiReviewModeration: AiReviewModerationClient;
  database: DatabaseClient;
  jobQueue: PgBoss;
  logger: Logger;
}): ReviewModerationWorker {
  return Object.freeze({
    async start(): Promise<void> {
      await options.jobQueue.work<ReviewModerationTask>(
        reviewModerationQueueName,
        { batchSize: 1 },
        async (jobs) => {
          const [job] = jobs;

          if (!job) {
            return { status: "skipped" };
          }

          const reviewUpdatedAt = new Date(job.data.reviewUpdatedAt);

          if (Number.isNaN(reviewUpdatedAt.getTime())) {
            throw new Error("Review moderation job contains an invalid timestamp.");
          }

          const review = await options.database.review.findUnique({
            where: { id: job.data.reviewId },
            select: {
              id: true,
              stars: true,
              text: true,
              status: true,
              moderationStatus: true,
              updatedAt: true,
              business: {
                select: {
                  id: true,
                  displayName: true
                }
              }
            }
          });

          const reviewIsCurrent =
            review !== null &&
            review.status === "PUBLISHED" &&
            review.moderationStatus === "UNREVIEWED" &&
            review.updatedAt.getTime() === reviewUpdatedAt.getTime();

          if (!reviewIsCurrent) {
            options.logger.info({ reviewId: job.data.reviewId }, "Skipped stale review moderation job");
            return { status: "skipped" };
          }

          const result = await options.aiReviewModeration.evaluateCustomerReview({
            business: {
              id: review.business.id,
              name: review.business.displayName
            },
            reviewId: review.id,
            reviewUpdatedAt: review.updatedAt.toISOString(),
            stars: review.stars,
            text: review.text
          });

          return { status: result };
        }
      );
    }
  });
}
