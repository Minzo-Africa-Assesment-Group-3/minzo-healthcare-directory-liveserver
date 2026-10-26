import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import type { ObjectStorage } from "../../../../../infrastructure/storage/index.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { signedMediaDownloadLifetimeSeconds } from "../../../../business/media/business-media.js";
import { getRatingCutoff } from "../../../reviews/review.policy.js";
import type { getPublicBusinessProfileContract } from "./get-public-business-profile.contract.js";
import { presentPublicBusinessProfile } from "./get-public-business-profile.presenter.js";
import { publicBusinessProfileSelect } from "./get-public-business-profile.select.js";

export function createGetPublicBusinessProfileHandler(dependencies: {
  database: DatabaseClient;
  objectStorage: ObjectStorage;
}): AppRouteQueryImplementation<typeof getPublicBusinessProfileContract> {
  return async ({ params, req }) => {
    const viewerUserId = req.auth?.realm === "user" ? req.auth.subjectId : undefined;
    const result = await dependencies.database.$transaction(async (transaction) => {
      const business = await transaction.business.findFirst({
        where: {
          slug: params.slug,
          status: "APPROVED"
        },
        select: publicBusinessProfileSelect
      });

      if (!business) {
        return null;
      }

      const rating = await transaction.review.aggregate({
        where: {
          businessId: business.id,
          status: "PUBLISHED",
          submittedAt: { gte: getRatingCutoff() }
        },
        _avg: { stars: true },
        _count: { _all: true }
      });
      const rawAverage = rating._avg.stars;
      const follow = viewerUserId
        ? await transaction.businessFollow.findUnique({
            where: {
              userId_businessId: {
                businessId: business.id,
                userId: viewerUserId
              }
            },
            select: { businessId: true }
          })
        : null;

      return {
        business,
        isFollowedByCurrentUser: follow !== null,
        rating: {
          averageRating: rawAverage === null ? null : Math.round(rawAverage * 100) / 100,
          reviewCount: rating._count._all
        }
      };
    });

    if (!result) {
      throw new AppError({
        code: "business_not_found",
        message: "The requested business does not exist.",
        statusCode: 404,
        title: "Business not found"
      });
    }

    try {
      const mediaUrls = await Promise.all(
        result.business.media.map(async (media) => {
          const { signedUrl } = await dependencies.objectStorage.createSignedDownloadAuthorization(
            media.bucket,
            media.objectKey,
            signedMediaDownloadLifetimeSeconds
          );

          return { id: media.id, url: signedUrl };
        })
      );

      return {
        status: 200,
        body: presentPublicBusinessProfile(
          result.business,
          result.rating,
          mediaUrls,
          result.isFollowedByCurrentUser
        )
      };
    } catch (cause) {
      throw new AppError({
        cause,
        code: "media_storage_unavailable",
        message: "The business gallery could not be loaded.",
        statusCode: 503,
        title: "Media storage unavailable"
      });
    }
  };
}
