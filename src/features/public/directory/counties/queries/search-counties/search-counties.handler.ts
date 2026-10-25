import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../../infrastructure/database/index.js";
import type { searchCountiesContract } from "./search-counties.contract.js";

export function createSearchCountiesHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof searchCountiesContract> {
  return async ({ query }) => {
    const limit = query.limit ?? (query.search ? 10 : undefined);
    const counties = await dependencies.database.county.findMany({
      where: {
        isActive: true,
        ...(query.search
          ? {
              name: {
                contains: query.search,
                mode: "insensitive" as const
              }
            }
          : {})
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      ...(limit !== undefined ? { take: limit } : {}),
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

    return {
      status: 200,
      body: { data: counties }
    };
  };
}
