import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { Prisma } from "../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../shared/authentication/index.js";
import { createPaginatedResponse } from "../../../../shared/pagination/index.js";
import type { listMyReviewsContract } from "./list-my-reviews.contract.js";

export function createListMyReviewsHandler({ database }: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof listMyReviewsContract> {
  return async ({ req, res, query }) => {
    res.setHeader("Cache-Control", "no-store");
    const userId = requireAuthenticatedPrincipal(req, "user").subjectId;
    const where: Prisma.ReviewWhereInput = { userId, status: { not: "DELETED" } };
    const [totalItems, reviews] = await database.$transaction([
      database.review.count({ where }),
      database.review.findMany({
        where,
        orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
        skip: (query.pageNumber - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true, stars: true, text: true, isAnonymous: true,
          status: true, moderationStatus: true, submittedAt: true, updatedAt: true,
          business: { select: { id: true, displayName: true, slug: true } },
        },
      }),
    ]);
    return {
      status: 200,
      body: createPaginatedResponse({
        data: reviews.map(({ status, submittedAt, updatedAt, ...review }) => ({
          ...review,
          publicationStatus: status as "PUBLISHED" | "HIDDEN",
          submittedAt: submittedAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        })),
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
        requestUrl: req.originalUrl,
        totalItems,
      }),
    };
  };
}
