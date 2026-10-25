import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import type { deleteReviewContract } from "./delete-review.contract.js";

export function createDeleteReviewHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof deleteReviewContract> {
  return async ({ params, req }) => {
    const userId = requireAuthenticatedPrincipal(req, "user").subjectId;
    const review = await dependencies.database.review.findUnique({
      where: { id: params.reviewId },
      select: {
        id: true,
        userId: true,
        status: true
      }
    });

    if (!review || review.status === "DELETED") {
      throw new AppError({
        code: "review_not_found",
        message: "The requested review does not exist.",
        statusCode: 404,
        title: "Review not found"
      });
    }

    if (review.userId !== userId) {
      throw new AppError({
        code: "permission_denied",
        message: "You cannot delete another user's review.",
        statusCode: 403,
        title: "Permission denied"
      });
    }

    await dependencies.database.review.update({
      where: { id: review.id },
      data: {
        status: "DELETED",
        deletedAt: new Date()
      },
      select: { id: true }
    });

    return {
      status: 204,
      body: undefined
    };
  };
}
