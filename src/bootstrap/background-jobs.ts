import type { PgBoss } from "pg-boss";

import type { ReviewModerationWorker } from "../features/customer-feedback-moderation/services/review-moderation-worker.js";

export interface BackgroundJobs {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createBackgroundJobs(options: {
  jobQueue: PgBoss;
  reviewModerationWorker: ReviewModerationWorker | undefined;
}): BackgroundJobs {
  return Object.freeze({
    async start(): Promise<void> {
      await options.jobQueue.start();

      if (options.reviewModerationWorker) {
        await options.reviewModerationWorker.start();
      }
    },
    async stop(): Promise<void> {
      await options.jobQueue.stop();
    }
  });
}
