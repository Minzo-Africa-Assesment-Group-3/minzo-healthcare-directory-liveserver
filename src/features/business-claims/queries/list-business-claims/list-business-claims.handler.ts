import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../shared/authentication/route-authentication.js";
import { createPaginatedResponse } from "../../../../shared/pagination/index.js";
import { requireBusinessClaimsAdmin } from "../../business-claim.authorization.js";
import { presentAdminBusinessClaim } from "../../business-claim.presenter.js";
import { adminBusinessClaimSelect } from "../../business-claim.select.js";
import type { listBusinessClaimsContract } from "./list-business-claims.contract.js";

export function createListBusinessClaimsHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof listBusinessClaimsContract> {
  return async ({ query, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireBusinessClaimsAdmin({
      adminUserId,
      database: dependencies.database,
    });

    const where = { status: query.status } as const;
    const [totalItems, claims] = await dependencies.database.$transaction([
      dependencies.database.businessClaim.count({ where }),
      dependencies.database.businessClaim.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: (query.pageNumber - 1) * query.pageSize,
        take: query.pageSize,
        select: adminBusinessClaimSelect,
      }),
    ]);

    return {
      status: 200,
      body: createPaginatedResponse({
        data: claims.map(presentAdminBusinessClaim),
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
        requestUrl: req.originalUrl,
        totalItems,
      }),
    };
  };
}
