import { fromPrisma, type PgBoss } from "pg-boss";

import type { Prisma } from "../../../../generated/prisma/client.js";

export const reviewModerationQueueName = "customer-review-moderation";

export interface ReviewModerationTask {
  reviewId: string;
  reviewUpdatedAt: Date;
}

export interface ReviewModerationQueue {
  initialize(): Promise<void>;
  enqueue(transaction: Prisma.TransactionClient, task: ReviewModerationTask): Promise<void>;
}

export function createReviewModerationQueue(jobQueue: PgBoss): ReviewModerationQueue {
  return Object.freeze({
    async initialize(): Promise<void> {
      await jobQueue.createQueue(reviewModerationQueueName);
    },
    async enqueue(transaction: Prisma.TransactionClient, task: ReviewModerationTask): Promise<void> {
      await jobQueue.send(
        reviewModerationQueueName,
        {
          reviewId: task.reviewId,
          reviewUpdatedAt: task.reviewUpdatedAt.toISOString()
        },
        {
          db: fromPrisma(transaction),
          deleteAfterSeconds: 60 * 60 * 24 * 7,
          expireInSeconds: 120,
          retryBackoff: true,
          retryDelay: 2,
          retryLimit: 5
        }
      );
    }
  });
}
