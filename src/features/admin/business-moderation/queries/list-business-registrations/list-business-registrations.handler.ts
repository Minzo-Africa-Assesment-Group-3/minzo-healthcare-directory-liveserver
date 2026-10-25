import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { createPaginatedResponse } from "../../../../../shared/pagination/index.js";
import { requireBusinessModerationAdmin } from "../../business-moderation.authorization.js";
import { presentBusinessModerationListItem } from "../../business-moderation.presenter.js";
import { businessModerationListSelect } from "../../business-moderation.select.js";
import type { listBusinessRegistrationsContract } from "./list-business-registrations.contract.js";

export function createListBusinessRegistrationsHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof listBusinessRegistrationsContract> {
  return async ({ query, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireBusinessModerationAdmin({
      adminUserId,
      database: dependencies.database
    });

    const search = query.search?.trim();
    const where: Prisma.BusinessWhereInput = {
      source: "SELF_REGISTERED",
      status: query.status,
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: "insensitive" } },
              { legalName: { contains: search, mode: "insensitive" } },
              {
                registrationNumber: {
                  contains: search,
                  mode: "insensitive"
                }
              },
              {
                memberships: {
                  some: {
                    user: {
                      OR: [
                        {
                          displayName: {
                            contains: search,
                            mode: "insensitive"
                          }
                        },
                        {
                          email: {
                            contains: search,
                            mode: "insensitive"
                          }
                        }
                      ]
                    }
                  }
                }
              },
              {
                locations: {
                  some: {
                    OR: [
                      { county: { contains: search, mode: "insensitive" } },
                      {
                        cityOrTown: {
                          contains: search,
                          mode: "insensitive"
                        }
                      }
                    ]
                  }
                }
              }
            ]
          }
        : {})
    };
    const [totalItems, businesses] = await dependencies.database.$transaction([
      dependencies.database.business.count({ where }),
      dependencies.database.business.findMany({
        where,
        orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
        skip: (query.pageNumber - 1) * query.pageSize,
        take: query.pageSize,
        select: businessModerationListSelect
      })
    ]);

    return {
      status: 200,
      body: createPaginatedResponse({
        data: businesses.map(presentBusinessModerationListItem),
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
        requestUrl: req.originalUrl,
        totalItems
      })
    };
  };
}
