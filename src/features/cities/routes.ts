import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../infrastructure/database/index.js";
import { searchCitiesContract } from "./queries/search-cities/search-cities.contract.js";
import { createSearchCitiesHandler } from "./queries/search-cities/search-cities.handler.js";

const contract = initContract();

export const citiesContract = contract.router({
  search: searchCitiesContract,
});

export interface CitiesRouteDependencies {
  database: DatabaseClient;
}

export function createCitiesHandlers(
  dependencies: CitiesRouteDependencies,
) {
  return {
    search: createSearchCitiesHandler(dependencies),
  };
}
