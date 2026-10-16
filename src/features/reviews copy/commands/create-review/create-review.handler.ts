import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { Prisma } from "../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { getPublicReviewCutoff } from "../../review.policy.js";
import { presentPublicReview } from "../../review.presenter.js";
import { publicReviewSelect } from "../../review.select.js";
import type { createReviewContract } from "./create-review.contract.js";

function reviewConflictError(): AppError {
  return new AppError({
    code: "active_review_already_exists",
    message:
      "You already have an active review for this business. Update that review instead.",
    statusCode: 409,
    title: "Active review already exists",
  });
}

export function createCreateReviewHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof createReviewContract> {
  return async ({ body, params, req }) => {
    const userId = requireAuthenticatedPrincipal(req, "user").subjectId;
    const now = new Date();
    const publicReviewCutoff = getPublicReviewCutoff(now);

    try {
      const review = await dependencies.database.$transaction(
        async (transaction) => {
          const business = await transaction.business.findFirst({
            where: {
              id: params.businessId,
              status: "APPROVED",
            },
            select: { id: true },
          });

          if (!business) {
            throw new AppError({
              code: "business_not_found",
              message: "The requested business does not exist.",
              statusCode: 404,
              title: "Business not found",
            });
          }

          const existingReview = await transaction.review.findUnique({
            where: {
              businessId_userId: {
                businessId: business.id,
                userId,
              },
            },
            select: {
              id: true,
              status: true,
              submittedAt: true,
            },
          });

          if (
            existingReview &&
            existingReview.status !== "DELETED" &&
            existingReview.submittedAt >= publicReviewCutoff
          ) {
            throw reviewConflictError();
          }

          if (existingReview) {
            return transaction.review.update({
              where: { id: existingReview.id },
              data: {
                stars: body.stars,
                text: body.text,
                isAnonymous: body.isAnonymous,
                status: "PUBLISHED",
                moderationStatus: "UNREVIEWED",
                submittedAt: now,
                deletedAt: null,
              },
              select: publicReviewSelect,
            });
          }

          return transaction.review.create({
            data: {
              businessId: business.id,
              userId,
              stars: body.stars,
              text: body.text,
              isAnonymous: body.isAnonymous,
              submittedAt: now,
            },
            select: publicReviewSelect,
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return {
        status: 201,
        body: presentPublicReview(review, true),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")
      ) {
        throw reviewConflictError();
      }

      throw error;
    }
  };
}
