import type { PgBoss } from "pg-boss";

import type { ReviewModerationWorker } from "../features/customer-feedback-moderation/services/review-moderation-worker.js";
import type { ReviewModerationQueue } from "../features/customer-feedback-moderation/services/review-moderation-queue.js";
import type { ReviewRejectionNotificationQueue } from "../features/customer-feedback-moderation/services/review-rejection-notification-queue.js";
import type { ReviewRejectionNotificationWorker } from "../features/customer-feedback-moderation/services/review-rejection-notification-worker.js";

export interface BackgroundJobs {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createBackgroundJobs(options: {
  jobQueue: PgBoss;
  reviewModerationQueue: ReviewModerationQueue;
  reviewModerationWorker: ReviewModerationWorker | undefined;
  reviewRejectionNotificationQueue: ReviewRejectionNotificationQueue;
  reviewRejectionNotificationWorker: ReviewRejectionNotificationWorker;
}): BackgroundJobs {
  return Object.freeze({
    async start(): Promise<void> {
      await options.jobQueue.start();
      await options.reviewModerationQueue.initialize();
      await options.reviewRejectionNotificationQueue.initialize();

      if (options.reviewModerationWorker) {
        await options.reviewModerationWorker.start();
      }

      await options.reviewRejectionNotificationWorker.start();
    },
    async stop(): Promise<void> {
      await options.jobQueue.stop();
    }
  });
}
