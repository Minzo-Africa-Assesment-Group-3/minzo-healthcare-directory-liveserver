import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import type { AuthenticationMiddlewares } from "../../../shared/authentication/authentication.middleware.js";
import type { ReviewModerationQueue } from "../../admin/customer-reviews/services/review-moderation-queue.js";
import { createReviewContract } from "./commands/create-review/create-review.contract.js";
import { createCreateReviewHandler } from "./commands/create-review/create-review.handler.js";
import { deleteReviewContract } from "./commands/delete-review/delete-review.contract.js";
import { createDeleteReviewHandler } from "./commands/delete-review/delete-review.handler.js";
import { updateReviewContract } from "./commands/update-review/update-review.contract.js";
import { createUpdateReviewHandler } from "./commands/update-review/update-review.handler.js";
import { getBusinessRatingContract } from "./queries/get-business-rating/get-business-rating.contract.js";
import { createGetBusinessRatingHandler } from "./queries/get-business-rating/get-business-rating.handler.js";
import { listBusinessReviewsContract } from "./queries/list-business-reviews/list-business-reviews.contract.js";
import { createListBusinessReviewsHandler } from "./queries/list-business-reviews/list-business-reviews.handler.js";
import { listManagedBusinessFeedbackContract } from "./queries/list-managed-business-feedback/list-managed-business-feedback.contract.js";
import { createListManagedBusinessFeedbackHandler } from "./queries/list-managed-business-feedback/list-managed-business-feedback.handler.js";

const contract = initContract();

export const reviewsContract = contract.router({
  create: createReviewContract,
  updateMine: updateReviewContract,
  deleteMine: deleteReviewContract,
  listForBusiness: listBusinessReviewsContract,
  listManagedBusinessReviews: listManagedBusinessFeedbackContract,
  getBusinessRating: getBusinessRatingContract
});

export interface ReviewsRouteDependencies {
  database: DatabaseClient;
  moderationQueue: ReviewModerationQueue;
}

export function createReviewsHandlers(
  dependencies: ReviewsRouteDependencies,
  { optionalUser: optionallyAuthenticateUser, user: authenticateUser }: AuthenticationMiddlewares
) {
  return {
    create: {
      middleware: [authenticateUser],
      handler: createCreateReviewHandler(dependencies)
    },
    updateMine: {
      middleware: [authenticateUser],
      handler: createUpdateReviewHandler(dependencies)
    },
    deleteMine: {
      middleware: [authenticateUser],
      handler: createDeleteReviewHandler(dependencies)
    },
    listForBusiness: {
      middleware: [optionallyAuthenticateUser],
      handler: createListBusinessReviewsHandler(dependencies)
    },
    listManagedBusinessReviews: {
      middleware: [authenticateUser],
      handler: createListManagedBusinessFeedbackHandler(dependencies)
    },
    getBusinessRating: createGetBusinessRatingHandler(dependencies)
  };
}
