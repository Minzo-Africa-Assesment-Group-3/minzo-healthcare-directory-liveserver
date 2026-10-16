import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../infrastructure/database/index.js";
import type { ObjectStorage } from "../../infrastructure/storage/index.js";
import type { AuthenticationMiddlewares } from "../../shared/authentication/authentication.middleware.js";
import { updateLocationServicesContract } from "./commands/update-location-services/update-location-services.contract.js";
import { createUpdateLocationServicesHandler } from "./commands/update-location-services/update-location-services.handler.js";
import { getPublicBusinessProfileContract } from "./queries/get-public-business-profile/get-public-business-profile.contract.js";
import { createGetPublicBusinessProfileHandler } from "./queries/get-public-business-profile/get-public-business-profile.handler.js";
import { searchBusinessesContract } from "./queries/search-businesses/search-businesses.contract.js";
import { createSearchBusinessesHandler } from "./queries/search-businesses/search-businesses.handler.js";

const contract = initContract();

export const businessesContract = contract.router({
  getPublicProfile: getPublicBusinessProfileContract,
  search: searchBusinessesContract,
  updateLocationServices: updateLocationServicesContract,
});

export interface BusinessesRouteDependencies {
  database: DatabaseClient;
  objectStorage: ObjectStorage;
}

export function createBusinessesHandlers(
  dependencies: BusinessesRouteDependencies,
  { user: authenticateUser }: AuthenticationMiddlewares,
) {
  return {
    getPublicProfile: createGetPublicBusinessProfileHandler(dependencies),
    search: createSearchBusinessesHandler(dependencies),
    updateLocationServices: {
      middleware: [authenticateUser],
      handler: createUpdateLocationServicesHandler(dependencies),
    },
  };
}
