import { randomUUID } from "node:crypto";

import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import type { ObjectStorage } from "../../../../../infrastructure/storage/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { createBusinessRegistrationDocumentObjectKey } from "../../business-registration-document.js";
import type { requestBusinessRegistrationDocumentUploadContract } from "./request-document-upload.contract.js";

const signedUploadLifetimeMilliseconds = 2 * 60 * 60 * 1_000;

export function createRequestBusinessRegistrationDocumentUploadHandler(dependencies: {
  businessRegistrationsBucket: string;
  database: DatabaseClient;
  objectStorage: ObjectStorage;
}): AppRouteMutationImplementation<typeof requestBusinessRegistrationDocumentUploadContract> {
  return async ({ body, params, req }) => {
    const ownerUserId = requireAuthenticatedPrincipal(req, "user").subjectId;

    const business = await dependencies.database.business.findFirst({
      where: {
        id: params.businessId,
        source: "SELF_REGISTERED",
        status: "PENDING_APPROVAL",
        registrationDocumentKey: null,
        memberships: {
          some: { userId: ownerUserId }
        }
      },
      select: { id: true }
    });

    if (!business) {
      throw new AppError({
        code: "business_registration_document_unavailable",
        message:
          "The business does not exist, is not managed by you, or already has a registration document.",
        statusCode: 404,
        title: "Business registration document unavailable"
      });
    }

    const documentId = randomUUID();
    const objectKey = createBusinessRegistrationDocumentObjectKey({
      businessId: business.id,
      documentId,
      mimeType: body.mimeType,
      userId: ownerUserId
    });
    const uploadExpiresAt = new Date(Date.now() + signedUploadLifetimeMilliseconds);

    await dependencies.database.businessRegistrationDocument.create({
      data: {
        id: documentId,
        businessId: business.id,
        ownerUserId,
        bucket: dependencies.businessRegistrationsBucket,
        objectKey,
        originalFileName: body.fileName.trim(),
        declaredMimeType: body.mimeType,
        declaredSizeBytes: body.sizeBytes,
        uploadExpiresAt
      }
    });

    try {
      const authorization = await dependencies.objectStorage.createSignedUploadAuthorization(
        dependencies.businessRegistrationsBucket,
        objectKey
      );

      return {
        status: 201,
        body: {
          documentId,
          bucket: dependencies.businessRegistrationsBucket,
          path: authorization.path,
          token: authorization.token,
          expiresAt: uploadExpiresAt.toISOString()
        }
      };
    } catch (cause) {
      await dependencies.database.businessRegistrationDocument.delete({
        where: { id: documentId }
      });

      throw new AppError({
        cause,
        code: "document_storage_unavailable",
        message: "The registration-document upload could not be authorized.",
        statusCode: 503,
        title: "Document storage unavailable"
      });
    }
  };
}
