import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { searchCountiesContract } from "./queries/search-counties/search-counties.contract.js";
import { createSearchCountiesHandler } from "./queries/search-counties/search-counties.handler.js";

const contract = initContract();

export const countiesContract = contract.router({
  search: searchCountiesContract
});

export interface CountiesRouteDependencies {
  database: DatabaseClient;
}

export function createCountiesHandlers(dependencies: CountiesRouteDependencies) {
  return {
    search: createSearchCountiesHandler(dependencies)
  };
}
