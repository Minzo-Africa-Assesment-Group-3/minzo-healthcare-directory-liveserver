import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import type { ObjectStorage } from "../../../infrastructure/storage/index.js";
import type { AuthenticationMiddlewares } from "../../../shared/authentication/authentication.middleware.js";
import { followBusinessContract } from "./commands/follow-business/follow-business.contract.js";
import { createFollowBusinessHandler } from "./commands/follow-business/follow-business.handler.js";
import { unfollowBusinessContract } from "./commands/unfollow-business/unfollow-business.contract.js";
import { createUnfollowBusinessHandler } from "./commands/unfollow-business/unfollow-business.handler.js";
import { updateLocationServicesContract } from "./commands/update-location-services/update-location-services.contract.js";
import { createUpdateLocationServicesHandler } from "./commands/update-location-services/update-location-services.handler.js";
import { getPublicBusinessProfileContract } from "./queries/get-public-business-profile/get-public-business-profile.contract.js";
import { createGetPublicBusinessProfileHandler } from "./queries/get-public-business-profile/get-public-business-profile.handler.js";
import { searchBusinessesContract } from "./queries/search-businesses/search-businesses.contract.js";
import { createSearchBusinessesHandler } from "./queries/search-businesses/search-businesses.handler.js";
import { getBusinessOwnerDashboardOverviewContract } from "./queries/get-business-owner-dashboard-overview/get-business-owner-dashboard-overview.contract.js";
import { createGetBusinessOwnerDashboardOverviewHandler } from "./queries/get-business-owner-dashboard-overview/get-business-owner-dashboard-overview.handler.js";

const contract = initContract();

export const businessesContract = contract.router({
  getPublicProfile: getPublicBusinessProfileContract,
  search: searchBusinessesContract,
  follow: followBusinessContract,
  unfollow: unfollowBusinessContract,
  ownerDashboardOverview: getBusinessOwnerDashboardOverviewContract,
  updateLocationServices: updateLocationServicesContract
});

export interface BusinessesRouteDependencies {
  database: DatabaseClient;
  objectStorage: ObjectStorage;
}

export function createBusinessesHandlers(
  dependencies: BusinessesRouteDependencies,
  { optionalUser: optionallyAuthenticateUser, user: authenticateUser }: AuthenticationMiddlewares
) {
  return {
    getPublicProfile: {
      middleware: [optionallyAuthenticateUser],
      handler: createGetPublicBusinessProfileHandler(dependencies)
    },
    search: {
      middleware: [optionallyAuthenticateUser],
      handler: createSearchBusinessesHandler(dependencies)
    },
    follow: {
      middleware: [authenticateUser],
      handler: createFollowBusinessHandler(dependencies)
    },
    unfollow: {
      middleware: [authenticateUser],
      handler: createUnfollowBusinessHandler(dependencies)
    },
    ownerDashboardOverview: {
      middleware: [authenticateUser],
      handler: createGetBusinessOwnerDashboardOverviewHandler(dependencies)
    },
    updateLocationServices: {
      middleware: [authenticateUser],
      handler: createUpdateLocationServicesHandler(dependencies)
    }
  };
}
