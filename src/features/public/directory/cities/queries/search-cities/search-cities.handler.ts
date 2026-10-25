import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../../infrastructure/database/index.js";
import type { searchCitiesContract } from "./search-cities.contract.js";

export function createSearchCitiesHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof searchCitiesContract> {
  return async ({ query }) => {
    const cities = await dependencies.database.city.findMany({
      where: {
        countyId: query.countyId,
        isActive: true,
        county: { isActive: true },
        name: {
          contains: query.search,
          mode: "insensitive"
        }
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: query.limit,
      select: {
        id: true,
        countyId: true,
        name: true,
        slug: true
      }
    });

    return {
      status: 200,
      body: { data: cities }
    };
  };
}
