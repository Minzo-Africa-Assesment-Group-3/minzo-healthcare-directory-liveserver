import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { createPaginatedResponse } from "../../../../../shared/pagination/index.js";
import type { listFollowedBusinessesContract } from "./list-followed-businesses.contract.js";

export function createListFollowedBusinessesHandler({
  database
}: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof listFollowedBusinessesContract> {
  return async ({ req, res, query }) => {
    res.setHeader("Cache-Control", "no-store");
    const userId = requireAuthenticatedPrincipal(req, "user").subjectId;
    const where: Prisma.BusinessFollowWhereInput = {
      userId,
      business: { status: "APPROVED" }
    };
    const [totalItems, follows] = await database.$transaction([
      database.businessFollow.count({ where }),
      database.businessFollow.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { businessId: "desc" }],
        skip: (query.pageNumber - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          createdAt: true,
          business: {
            select: {
              id: true,
              displayName: true,
              slug: true,
              verificationStatus: true,
              _count: { select: { memberships: true } },
              locations: {
                where: { status: "ACTIVE" },
                orderBy: [{ isPrimary: "desc" }, { name: "asc" }, { id: "asc" }],
                take: 1,
                select: {
                  id: true,
                  name: true,
                  facilityType: true,
                  addressLine: true,
                  county: true,
                  cityOrTown: true,
                  latitude: true,
                  longitude: true,
                  isPrimary: true
                }
              }
            }
          }
        }
      })
    ]);
    return {
      status: 200,
      body: createPaginatedResponse({
        data: follows.map(({ business, createdAt }) => {
          const location = business.locations[0];

          return {
            business: {
              id: business.id,
              displayName: business.displayName,
              slug: business.slug,
              verificationStatus: business.verificationStatus,
              isClaimed: business._count.memberships > 0,
              location: location
                ? {
                    ...location,
                    latitude: location.latitude === null ? null : Number(location.latitude),
                    longitude: location.longitude === null ? null : Number(location.longitude)
                  }
                : null
            },
            followedAt: createdAt.toISOString()
          };
        }),
        ...query,
        totalItems,
        requestUrl: req.originalUrl
      })
    };
  };
}
