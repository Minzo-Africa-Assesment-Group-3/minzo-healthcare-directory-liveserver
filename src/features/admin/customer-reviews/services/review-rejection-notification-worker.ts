import type { PgBoss } from "pg-boss";
import type { Logger } from "pino";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import type { ReviewRejectionEmailService } from "./review-rejection-email.js";
import {
  reviewRejectionNotificationQueueName,
  type ReviewRejectionNotificationTask
} from "./review-rejection-notification-queue.js";

export interface ReviewRejectionNotificationWorker {
  start(): Promise<void>;
}

export function createReviewRejectionNotificationWorker(options: {
  database: DatabaseClient;
  email: ReviewRejectionEmailService;
  jobQueue: PgBoss;
  logger: Logger;
}): ReviewRejectionNotificationWorker {
  return Object.freeze({
    async start(): Promise<void> {
      await options.jobQueue.work<ReviewRejectionNotificationTask>(
        reviewRejectionNotificationQueueName,
        { batchSize: 1 },
        async (jobs) => {
          const [job] = jobs;

          if (!job) {
            return { status: "skipped" };
          }

          const moderation = await options.database.reviewModerationAction.findUnique({
            where: { id: job.data.moderationActionId },
            select: {
              actorType: true,
              decision: true,
              reason: true,
              review: {
                select: {
                  id: true,
                  moderationStatus: true,
                  status: true,
                  author: { select: { displayName: true, email: true } },
                  business: { select: { displayName: true } }
                }
              }
            }
          });

          if (
            !moderation ||
            moderation.decision !== "REJECTED" ||
            moderation.review.id !== job.data.reviewId ||
            moderation.review.status !== "HIDDEN" ||
            moderation.review.moderationStatus !== "REJECTED" ||
            !moderation.reason
          ) {
            options.logger.info(
              { moderationActionId: job.data.moderationActionId, reviewId: job.data.reviewId },
              "Skipped stale review rejection email job"
            );
            return { status: "skipped" };
          }

          await options.email.send({
            businessName: moderation.review.business.displayName,
            displayName: moderation.review.author.displayName,
            email: moderation.review.author.email,
            moderationActionId: job.data.moderationActionId,
            moderatedBy: moderation.actorType === "AUTOMATION" ? "AI" : "MINZO_ADMIN",
            reason: moderation.reason
          });

          return { status: "sent" };
        }
      );
    }
  });
}
