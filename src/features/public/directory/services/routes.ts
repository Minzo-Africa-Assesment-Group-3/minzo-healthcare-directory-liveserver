import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { searchServicesContract } from "./queries/search-services/search-services.contract.js";
import { createSearchServicesHandler } from "./queries/search-services/search-services.handler.js";

const contract = initContract();

export const servicesContract = contract.router({
  search: searchServicesContract
});

export interface ServicesRouteDependencies {
  database: DatabaseClient;
}

export function createServicesHandlers(dependencies: ServicesRouteDependencies) {
  return {
    search: createSearchServicesHandler(dependencies)
  };
}
