import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { createPaginatedResponse } from "../../../../../shared/pagination/index.js";
import { requireCustomerFeedbackModerator } from "../../customer-feedback-moderation.authorization.js";
import { presentCustomerFeedbackModerationListItem } from "../../customer-feedback-moderation.presenter.js";
import { customerFeedbackModerationListSelect } from "../../customer-feedback-moderation.select.js";
import type { listCustomerFeedbackForModerationContract } from "./list-customer-feedback.contract.js";

export function createListCustomerFeedbackForModerationHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof listCustomerFeedbackForModerationContract> {
  return async ({ query, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireCustomerFeedbackModerator({
      adminUserId,
      database: dependencies.database
    });

    const search = query.search?.trim();
    const where: Prisma.ReviewWhereInput = {
      moderationStatus: query.moderationStatus,
      status: { not: "DELETED" },
      ...(search
        ? {
            OR: [
              { text: { contains: search, mode: "insensitive" } },
              {
                business: {
                  OR: [
                    {
                      displayName: {
                        contains: search,
                        mode: "insensitive"
                      }
                    },
                    { slug: { contains: search, mode: "insensitive" } }
                  ]
                }
              },
              {
                author: {
                  OR: [
                    {
                      displayName: {
                        contains: search,
                        mode: "insensitive"
                      }
                    },
                    { email: { contains: search, mode: "insensitive" } }
                  ]
                }
              }
            ]
          }
        : {})
    };
    const [totalItems, feedback] = await dependencies.database.$transaction([
      dependencies.database.review.count({ where }),
      dependencies.database.review.findMany({
        where,
        orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
        skip: (query.pageNumber - 1) * query.pageSize,
        take: query.pageSize,
        select: customerFeedbackModerationListSelect
      })
    ]);

    return {
      status: 200,
      body: createPaginatedResponse({
        data: feedback.map(presentCustomerFeedbackModerationListItem),
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
        requestUrl: req.originalUrl,
        totalItems
      })
    };
  };
}
