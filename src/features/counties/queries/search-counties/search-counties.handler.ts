import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import type { searchCountiesContract } from "./search-counties.contract.js";

export function createSearchCountiesHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof searchCountiesContract> {
  return async ({ query }) => {
    const counties = await dependencies.database.county.findMany({
      where: {
        isActive: true,
        name: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      orderBy: [
        { name: "asc" },
        { id: "asc" },
      ],
      take: query.limit,
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    return {
      status: 200,
      body: { data: counties },
    };
  };
}
