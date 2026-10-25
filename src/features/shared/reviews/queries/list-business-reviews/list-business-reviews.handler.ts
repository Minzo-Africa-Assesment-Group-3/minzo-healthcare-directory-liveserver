import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { createPaginatedResponse } from "../../../../../shared/pagination/index.js";
import { requirePublicBusiness } from "../../review.authorization.js";
import { getPublicReviewCutoff } from "../../review.policy.js";
import { presentPublicReview } from "../../review.presenter.js";
import { publicReviewSelect } from "../../review.select.js";
import type { listBusinessReviewsContract } from "./list-business-reviews.contract.js";

export function createListBusinessReviewsHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteQueryImplementation<typeof listBusinessReviewsContract> {
  return async ({ params, query, req }) => {
    await requirePublicBusiness(dependencies.database, params.businessId);

    const viewerUserId = req.auth?.realm === "user" ? req.auth.subjectId : undefined;
    const where = {
      businessId: params.businessId,
      status: "PUBLISHED" as const,
      submittedAt: { gte: getPublicReviewCutoff() }
    };
    const pageStart = (query.pageNumber - 1) * query.pageSize;
    const { totalItems, reviews } = await dependencies.database.$transaction(async (transaction) => {
      const totalItems = await transaction.review.count({ where });

      if (!viewerUserId) {
        const reviews = await transaction.review.findMany({
          where,
          orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
          skip: pageStart,
          take: query.pageSize,
          select: publicReviewSelect
        });

        return {
          totalItems,
          reviews: reviews.map((review) => ({ mine: false, review }))
        };
      }

      const mine = await transaction.review.findFirst({
        where: {
          ...where,
          userId: viewerUserId
        },
        select: publicReviewSelect
      });

      if (!mine) {
        const reviews = await transaction.review.findMany({
          where,
          orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
          skip: pageStart,
          take: query.pageSize,
          select: publicReviewSelect
        });

        return {
          totalItems,
          reviews: reviews.map((review) => ({ mine: false, review }))
        };
      }

      const isFirstPage = pageStart === 0;
      const otherReviews = await transaction.review.findMany({
        where: {
          ...where,
          userId: { not: viewerUserId }
        },
        orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
        skip: isFirstPage ? 0 : pageStart - 1,
        take: isFirstPage ? query.pageSize - 1 : query.pageSize,
        select: publicReviewSelect
      });

      return {
        totalItems,
        reviews: [
          ...(isFirstPage ? [{ mine: true, review: mine }] : []),
          ...otherReviews.map((review) => ({ mine: false, review }))
        ]
      };
    });

    return {
      status: 200,
      body: createPaginatedResponse({
        data: reviews.map(({ mine, review }) => presentPublicReview(review, mine)),
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
        requestUrl: req.originalUrl,
        totalItems
      })
    };
  };
}
