import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import type { AuthenticationMiddlewares } from "../../../shared/authentication/authentication.middleware.js";
import { createCityContract } from "./commands/create-city/create-city.contract.js";
import { createCreateCityHandler } from "./commands/create-city/create-city.handler.js";
import { createCountyContract } from "./commands/create-county/create-county.contract.js";
import { createCreateCountyHandler } from "./commands/create-county/create-county.handler.js";
import { updateCityContract } from "./commands/update-city/update-city.contract.js";
import { createUpdateCityHandler } from "./commands/update-city/update-city.handler.js";
import { updateCountyContract } from "./commands/update-county/update-county.contract.js";
import { createUpdateCountyHandler } from "./commands/update-county/update-county.handler.js";

const contract = initContract();

export const adminDirectoryManagementContract = contract.router({
  createCounty: createCountyContract,
  updateCounty: updateCountyContract,
  createCity: createCityContract,
  updateCity: updateCityContract
});

export interface AdminDirectoryManagementRouteDependencies {
  database: DatabaseClient;
}

export function createAdminDirectoryManagementHandlers(
  dependencies: AdminDirectoryManagementRouteDependencies,
  { admin: authenticateAdmin }: AuthenticationMiddlewares
) {
  return {
    createCounty: {
      middleware: [authenticateAdmin],
      handler: createCreateCountyHandler(dependencies)
    },
    updateCounty: {
      middleware: [authenticateAdmin],
      handler: createUpdateCountyHandler(dependencies)
    },
    createCity: {
      middleware: [authenticateAdmin],
      handler: createCreateCityHandler(dependencies)
    },
    updateCity: {
      middleware: [authenticateAdmin],
      handler: createUpdateCityHandler(dependencies)
    }
  };
}
