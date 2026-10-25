import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../../infrastructure/database/index.js";
import type { searchServicesContract } from "./search-services.contract.js";

export function createSearchServicesHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof searchServicesContract> {
  return async ({ query }) => {
    const services = await dependencies.database.service.findMany({
      where: {
        name: {
          contains: query.search,
          mode: "insensitive"
        }
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: query.limit,
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

    return {
      status: 200,
      body: { data: services }
    };
  };
}
