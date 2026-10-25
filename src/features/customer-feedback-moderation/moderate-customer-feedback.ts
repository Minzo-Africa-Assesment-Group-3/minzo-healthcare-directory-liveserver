import { Prisma } from "../../generated/prisma/client.js";
import type { DatabaseClient } from "../../infrastructure/database/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { recordAuditLog } from "../audit-logs/record-audit-log.js";
import type { ReviewRejectionNotificationQueue } from "./services/review-rejection-notification-queue.js";

export type CustomerFeedbackModerationActor =
  { type: "ADMIN"; adminUserId: string } | { type: "AUTOMATION"; actorReference: string };

export type CustomerFeedbackModerationDecision = "APPROVED" | "FLAGGED" | "REJECTED";

export interface ModerateCustomerFeedbackInput {
  actor: CustomerFeedbackModerationActor;
  database: DatabaseClient;
  decision: CustomerFeedbackModerationDecision;
  expectedReviewUpdatedAt?: Date;
  reviewRejectionNotificationQueue: ReviewRejectionNotificationQueue;
  reviewId: string;
  reason?: string;
}

function moderationConflictError(message: string): AppError {
  return new AppError({
    code: "customer_review_moderation_conflict",
    message,
    statusCode: 409,
    title: "Customer feedback moderation conflict"
  });
}

export async function moderateCustomerFeedback({
  actor,
  database,
  decision,
  expectedReviewUpdatedAt,
  reviewRejectionNotificationQueue,
  reviewId,
  reason
}: ModerateCustomerFeedbackInput) {
  const normalizedReason = reason?.trim() || null;

  if (actor.type === "AUTOMATION" && actor.actorReference.trim().length === 0) {
    throw new TypeError("Automation moderation requires an actor reference.");
  }

  if ((decision === "REJECTED" || decision === "FLAGGED") && !normalizedReason) {
    throw new TypeError(`${decision} moderation requires a reason.`);
  }

  try {
    return await database.$transaction(
      async (transaction) => {
        const feedback = await transaction.review.findUnique({
          where: { id: reviewId },
          select: {
            id: true,
            status: true,
            moderationStatus: true,
            updatedAt: true
          }
        });

        if (!feedback || feedback.status === "DELETED") {
          throw new AppError({
            code: "customer_review_not_found",
            message: "The requested customer review does not exist.",
            statusCode: 404,
            title: "Customer feedback not found"
          });
        }

        if (actor.type === "AUTOMATION" && feedback.moderationStatus !== "UNREVIEWED") {
          throw moderationConflictError("This customer review has already been moderated.");
        }

        if (expectedReviewUpdatedAt && feedback.updatedAt.getTime() !== expectedReviewUpdatedAt.getTime()) {
          throw moderationConflictError(
            "This customer review changed after it was submitted for moderation."
          );
        }

        if (feedback.moderationStatus === decision) {
          throw moderationConflictError(`This customer review is already ${decision.toLowerCase()}.`);
        }

        const publicationStatus = decision === "REJECTED" ? ("HIDDEN" as const) : ("PUBLISHED" as const);
        const updated = await transaction.review.updateMany({
          where: {
            id: feedback.id,
            status: { not: "DELETED" },
            moderationStatus: feedback.moderationStatus,
            updatedAt: feedback.updatedAt
          },
          data: {
            status: publicationStatus,
            moderationStatus: decision
          }
        });

        if (updated.count !== 1) {
          throw moderationConflictError("The customer review changed while it was being moderated.");
        }

        const moderation = await transaction.reviewModerationAction.create({
          data: {
            reviewId: feedback.id,
            actorType: actor.type,
            decision,
            adminUserId: actor.type === "ADMIN" ? actor.adminUserId : null,
            actorReference: actor.type === "AUTOMATION" ? actor.actorReference : null,
            reason: normalizedReason
          },
          select: {
            id: true,
            actorType: true,
            decision: true,
            adminUserId: true,
            actorReference: true,
            reason: true,
            createdAt: true
          }
        });

        await recordAuditLog(transaction, {
          actor:
            actor.type === "ADMIN"
              ? { type: "ADMIN", adminUserId: actor.adminUserId }
              : {
                  type: "AUTOMATION",
                  actorReference: actor.actorReference
                },
          action: "customer_review.moderated",
          entity: { id: feedback.id, type: "CUSTOMER_REVIEW" },
          metadata: {
            decision,
            publicationStatus,
            reason: normalizedReason
          }
        });

        if (decision === "REJECTED") {
          await reviewRejectionNotificationQueue.enqueue(transaction, {
            moderationActionId: moderation.id,
            reviewId: feedback.id
          });
        }

        return {
          reviewId: feedback.id,
          publicationStatus,
          moderationStatus: decision,
          moderation: {
            ...moderation,
            createdAt: moderation.createdAt.toISOString(),
            moderatedBy: moderation.actorType === "ADMIN" ? ("MINZO_ADMIN" as const) : ("AI" as const)
          }
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw moderationConflictError("The customer review changed while it was being moderated.");
    }

    throw error;
  }
}
