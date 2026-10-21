import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { Prisma } from "../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../shared/authentication/route-authentication.js";
import { createPaginatedResponse } from "../../../../shared/pagination/index.js";
import { requireBusinessFeedbackViewer } from "../../business-feedback.authorization.js";
import type { listManagedBusinessFeedbackContract } from "./list-managed-business-feedback.contract.js";
import { presentManagedBusinessFeedback } from "./list-managed-business-feedback.presenter.js";
import { managedBusinessFeedbackSelect } from "./list-managed-business-feedback.select.js";

function getOrderBy(
  sort: "NEWEST" | "OLDEST" | "RATING_HIGH" | "RATING_LOW",
): Prisma.ReviewOrderByWithRelationInput[] {
  switch (sort) {
    case "OLDEST":
      return [{ submittedAt: "asc" }, { id: "asc" }];
    case "RATING_HIGH":
      return [{ stars: "desc" }, { submittedAt: "desc" }, { id: "desc" }];
    case "RATING_LOW":
      return [{ stars: "asc" }, { submittedAt: "desc" }, { id: "desc" }];
    case "NEWEST":
      return [{ submittedAt: "desc" }, { id: "desc" }];
  }
}

export function createListManagedBusinessFeedbackHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof listManagedBusinessFeedbackContract> {
  return async ({ params, query, req }) => {
    const userId = requireAuthenticatedPrincipal(req, "user").subjectId;
    await requireBusinessFeedbackViewer({
      businessId: params.businessId,
      database: dependencies.database,
      userId,
    });

    const search = query.search?.trim();
    const where: Prisma.ReviewWhereInput = {
      businessId: params.businessId,
      status: query.publicationStatus ?? { not: "DELETED" },
      ...(query.moderationStatus
        ? { moderationStatus: query.moderationStatus }
        : {}),
      ...(query.stars !== undefined ? { stars: query.stars } : {}),
      ...(search
        ? { text: { contains: search, mode: "insensitive" } }
        : {}),
    };
    const [totalItems, feedback] = await dependencies.database.$transaction([
      dependencies.database.review.count({ where }),
      dependencies.database.review.findMany({
        where,
        orderBy: getOrderBy(query.sort),
        skip: (query.pageNumber - 1) * query.pageSize,
        take: query.pageSize,
        select: managedBusinessFeedbackSelect,
      }),
    ]);

    return {
      status: 200,
      body: createPaginatedResponse({
        data: feedback.map(presentManagedBusinessFeedback),
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
        requestUrl: req.originalUrl,
        totalItems,
      }),
    };
  };
}
