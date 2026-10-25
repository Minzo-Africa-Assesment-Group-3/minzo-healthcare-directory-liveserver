import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import type { ObjectStorage } from "../../../../../infrastructure/storage/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { requireBusinessModerationAdmin } from "../../business-moderation.authorization.js";
import { presentBusinessModerationDetail } from "../../business-moderation.presenter.js";
import { businessModerationDetailSelect } from "../../business-moderation.select.js";
import type { getBusinessRegistrationContract } from "./get-business-registration.contract.js";

const signedDownloadLifetimeSeconds = 5 * 60;

export function createGetBusinessRegistrationHandler(dependencies: {
  database: DatabaseClient;
  objectStorage: ObjectStorage;
}): AppRouteQueryImplementation<typeof getBusinessRegistrationContract> {
  return async ({ params, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireBusinessModerationAdmin({
      adminUserId,
      database: dependencies.database
    });
    const business = await dependencies.database.business.findFirst({
      where: {
        id: params.businessId,
        source: "SELF_REGISTERED",
        status: { in: ["PENDING_APPROVAL", "APPROVED", "REJECTED"] }
      },
      select: businessModerationDetailSelect
    });

    if (!business) {
      throw new AppError({
        code: "business_registration_not_found",
        message: "The requested business registration does not exist.",
        statusCode: 404,
        title: "Business registration not found"
      });
    }

    const document = business.registrationDocuments[0];

    if (!document) {
      return {
        status: 200,
        body: presentBusinessModerationDetail(business, null)
      };
    }

    if (!document.verifiedMimeType || document.verifiedSizeBytes === null || !document.uploadedAt) {
      throw new AppError({
        code: "registration_document_incomplete",
        message: "The attached registration-document metadata is incomplete.",
        statusCode: 409,
        title: "Registration document incomplete"
      });
    }

    try {
      const { signedUrl } = await dependencies.objectStorage.createSignedDownloadAuthorization(
        document.bucket,
        document.objectKey,
        signedDownloadLifetimeSeconds
      );

      return {
        status: 200,
        body: presentBusinessModerationDetail(business, {
          url: signedUrl,
          expiresAt: new Date(Date.now() + signedDownloadLifetimeSeconds * 1_000)
        })
      };
    } catch (cause) {
      throw new AppError({
        cause,
        code: "document_storage_unavailable",
        message: "The registration-document URL could not be created.",
        statusCode: 503,
        title: "Document storage unavailable"
      });
    }
  };
}
