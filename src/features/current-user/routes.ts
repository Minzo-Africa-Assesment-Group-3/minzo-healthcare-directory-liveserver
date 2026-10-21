import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../infrastructure/database/index.js";
import type { AuthenticationMiddlewares } from "../../shared/authentication/authentication.middleware.js";
import { getMyProfileContract } from "./queries/get-my-profile/get-my-profile.contract.js";
import { createGetMyProfileHandler } from "./queries/get-my-profile/get-my-profile.handler.js";
import { listMyReviewsContract } from "./queries/list-my-reviews/list-my-reviews.contract.js";
import { createListMyReviewsHandler } from "./queries/list-my-reviews/list-my-reviews.handler.js";

export interface CurrentUserRouteDependencies { database: DatabaseClient }

export const currentUserContract = initContract().router({
  profile: getMyProfileContract,
  reviews: listMyReviewsContract,
});

export function createCurrentUserHandlers(
  dependencies: CurrentUserRouteDependencies,
  authentication: AuthenticationMiddlewares,
) {
  return {
    profile: { middleware: [authentication.user], handler: createGetMyProfileHandler(dependencies) },
    reviews: { middleware: [authentication.user], handler: createListMyReviewsHandler(dependencies) },
  };
}
