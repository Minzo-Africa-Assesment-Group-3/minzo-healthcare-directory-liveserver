import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import type { AuthenticationMiddlewares } from "../../../shared/authentication/authentication.middleware.js";
import { followBusinessContract } from "./commands/follow-business/follow-business.contract.js";
import { createFollowBusinessHandler } from "./commands/follow-business/follow-business.handler.js";
import { unfollowBusinessContract } from "./commands/unfollow-business/unfollow-business.contract.js";
import { createUnfollowBusinessHandler } from "./commands/unfollow-business/unfollow-business.handler.js";
import { listFollowedBusinessesContract } from "./queries/list-followed-businesses/list-followed-businesses.contract.js";
import { createListFollowedBusinessesHandler } from "./queries/list-followed-businesses/list-followed-businesses.handler.js";

export interface BusinessFollowsRouteDependencies {
  database: DatabaseClient;
}

export const businessFollowsContract = initContract().router({
  follow: followBusinessContract,
  unfollow: unfollowBusinessContract,
  listMine: listFollowedBusinessesContract
});

export function createBusinessFollowsHandlers(
  dependencies: BusinessFollowsRouteDependencies,
  authentication: AuthenticationMiddlewares
) {
  return {
    follow: {
      middleware: [authentication.user],
      handler: createFollowBusinessHandler(dependencies)
    },
    unfollow: {
      middleware: [authentication.user],
      handler: createUnfollowBusinessHandler(dependencies)
    },
    listMine: {
      middleware: [authentication.user],
      handler: createListFollowedBusinessesHandler(dependencies)
    }
  };
}
