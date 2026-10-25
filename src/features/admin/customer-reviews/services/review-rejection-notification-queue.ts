import { fromPrisma, type PgBoss } from "pg-boss";

import type { Prisma } from "../../../../generated/prisma/client.js";

export const reviewRejectionNotificationQueueName = "customer-review-rejection-notification";

export interface ReviewRejectionNotificationTask {
  moderationActionId: string;
  reviewId: string;
}

export interface ReviewRejectionNotificationQueue {
  enqueue(transaction: Prisma.TransactionClient, task: ReviewRejectionNotificationTask): Promise<void>;
  initialize(): Promise<void>;
}

export function createReviewRejectionNotificationQueue(jobQueue: PgBoss): ReviewRejectionNotificationQueue {
  return Object.freeze({
    async initialize(): Promise<void> {
      await jobQueue.createQueue(reviewRejectionNotificationQueueName);
    },
    async enqueue(
      transaction: Prisma.TransactionClient,
      task: ReviewRejectionNotificationTask
    ): Promise<void> {
      await jobQueue.send(reviewRejectionNotificationQueueName, task, {
        db: fromPrisma(transaction),
        deleteAfterSeconds: 60 * 60 * 24 * 7,
        expireInSeconds: 300,
        retryBackoff: true,
        retryDelay: 5,
        retryLimit: 5
      });
    }
  });
}
