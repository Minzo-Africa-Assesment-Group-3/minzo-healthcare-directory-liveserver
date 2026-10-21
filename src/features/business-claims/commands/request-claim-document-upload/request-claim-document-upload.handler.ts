import { randomUUID } from "node:crypto";

import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import type { ObjectStorage } from "../../../../infrastructure/storage/index.js";
import { requireAuthenticatedPrincipal } from "../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { createClaimDocumentObjectKey } from "../../business-claim-document.js";
import type { requestClaimDocumentUploadContract } from "./request-claim-document-upload.contract.js";

const signedUploadLifetimeMilliseconds = 2 * 60 * 60 * 1_000;

export function createRequestClaimDocumentUploadHandler(dependencies: {
  businessClaimsBucket: string;
  database: DatabaseClient;
  objectStorage: ObjectStorage;
}): AppRouteMutationImplementation<
  typeof requestClaimDocumentUploadContract
> {
  return async ({ body, req }) => {
    const ownerUserId = requireAuthenticatedPrincipal(req, "user").subjectId;
    const documentId = randomUUID();
    const objectKey = createClaimDocumentObjectKey({
      documentId,
      mimeType: body.mimeType,
      userId: ownerUserId,
    });
    const uploadExpiresAt = new Date(
      Date.now() + signedUploadLifetimeMilliseconds,
    );

    await dependencies.database.businessClaimDocument.create({
      data: {
        id: documentId,
        ownerUserId,
        bucket: dependencies.businessClaimsBucket,
        objectKey,
        originalFileName: body.fileName.trim(),
        declaredMimeType: body.mimeType,
        declaredSizeBytes: body.sizeBytes,
        uploadExpiresAt,
      },
    });

    try {
      const authorization =
        await dependencies.objectStorage.createSignedUploadAuthorization(
          dependencies.businessClaimsBucket,
          objectKey,
        );

      return {
        status: 201,
        body: {
          documentId,
          bucket: dependencies.businessClaimsBucket,
          path: authorization.path,
          token: authorization.token,
          expiresAt: uploadExpiresAt.toISOString(),
        },
      };
    } catch (cause) {
      await dependencies.database.businessClaimDocument.delete({
        where: { id: documentId },
      });

      throw new AppError({
        cause,
        code: "document_storage_unavailable",
        message: "The document upload could not be authorized.",
        statusCode: 503,
        title: "Document storage unavailable",
      });
    }
  };
}
