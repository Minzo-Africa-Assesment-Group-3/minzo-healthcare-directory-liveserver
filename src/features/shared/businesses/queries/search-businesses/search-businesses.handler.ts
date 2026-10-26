import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { createPaginatedResponse } from "../../../../../shared/pagination/index.js";
import type { searchBusinessesContract } from "./search-businesses.contract.js";
import { searchBusinesses } from "./search-businesses.query.js";

export function createSearchBusinessesHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof searchBusinessesContract> {
  return async ({ query, req }) => {
    const viewerUserId = req.auth?.realm === "user" ? req.auth.subjectId : undefined;
    const result = await searchBusinesses(dependencies.database, query, viewerUserId);

    return {
      status: 200,
      body: createPaginatedResponse({
        data: result.data,
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
        requestUrl: req.originalUrl,
        totalItems: result.totalItems
      })
    };
  };
}
