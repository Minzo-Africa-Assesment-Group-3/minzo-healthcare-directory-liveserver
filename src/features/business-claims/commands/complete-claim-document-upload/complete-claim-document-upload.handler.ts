import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import type { ObjectStorage } from "../../../../infrastructure/storage/index.js";
import { requireAuthenticatedPrincipal } from "../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import {
  detectClaimDocumentMimeType,
  maximumClaimDocumentSizeBytes,
} from "../../business-claim-document.js";
import type { completeClaimDocumentUploadContract } from "./complete-claim-document-upload.contract.js";

interface CompletedDocument {
  id: string;
  originalFileName: string;
  verifiedMimeType: string | null;
  verifiedSizeBytes: number | null;
  status: "PENDING_UPLOAD" | "UPLOADED" | "ATTACHED" | "REJECTED";
  uploadedAt: Date | null;
}

function presentCompletedDocument(document: CompletedDocument) {
  if (
    !document.verifiedMimeType ||
    document.verifiedSizeBytes === null ||
    !document.uploadedAt ||
    (document.status !== "UPLOADED" && document.status !== "ATTACHED")
  ) {
    throw new Error("Completed claim document metadata is incomplete.");
  }

  return {
    id: document.id,
    originalFileName: document.originalFileName,
    mimeType: document.verifiedMimeType as
      | "application/pdf"
      | "image/jpeg"
      | "image/png",
    sizeBytes: document.verifiedSizeBytes,
    status: document.status,
    uploadedAt: document.uploadedAt.toISOString(),
  };
}

function invalidDocumentError(reason: string): AppError {
  return new AppError({
    code: "invalid_claim_document",
    message: reason,
    statusCode: 422,
    title: "Invalid claim document",
  });
}

export function createCompleteClaimDocumentUploadHandler(dependencies: {
  database: DatabaseClient;
  objectStorage: ObjectStorage;
}): AppRouteMutationImplementation<
  typeof completeClaimDocumentUploadContract
> {
  return async ({ params, req }) => {
    const ownerUserId = requireAuthenticatedPrincipal(req, "user").subjectId;
    const document =
      await dependencies.database.businessClaimDocument.findFirst({
        where: {
          id: params.documentId,
          ownerUserId,
        },
      });

    if (!document) {
      throw new AppError({
        code: "claim_document_not_found",
        message: "The requested claim document does not exist.",
        statusCode: 404,
        title: "Claim document not found",
      });
    }

    if (document.status === "UPLOADED" || document.status === "ATTACHED") {
      return {
        status: 200,
        body: presentCompletedDocument(document),
      };
    }

    if (document.status === "REJECTED") {
      throw new AppError({
        code: "claim_document_rejected",
        message: "This claim document was rejected and cannot be reused.",
        statusCode: 409,
        title: "Claim document rejected",
      });
    }

    try {
      const exists = await dependencies.objectStorage.objectExists(
        document.bucket,
        document.objectKey,
      );

      if (!exists) {
        throw new AppError({
          code: "claim_document_upload_incomplete",
          message: "The claim document has not been uploaded yet.",
          statusCode: 409,
          title: "Claim document upload incomplete",
        });
      }

      const objectInfo = await dependencies.objectStorage.getObjectInfo(
        document.bucket,
        document.objectKey,
      );

      if (
        objectInfo.sizeBytes > maximumClaimDocumentSizeBytes ||
        objectInfo.sizeBytes !== document.declaredSizeBytes
      ) {
        await rejectUploadedDocument(
          dependencies,
          document,
          "The uploaded file size does not match the authorized upload.",
        );
      }

      const fileBytes = await dependencies.objectStorage.downloadObject(
        document.bucket,
        document.objectKey,
      );
      const detectedMimeType = detectClaimDocumentMimeType(fileBytes);

      if (
        fileBytes.byteLength !== document.declaredSizeBytes ||
        detectedMimeType !== document.declaredMimeType
      ) {
        await rejectUploadedDocument(
          dependencies,
          document,
          "The uploaded file content does not match its declared type or size.",
        );
      }

      const uploadedAt = new Date();
      const completed =
        await dependencies.database.businessClaimDocument.update({
          where: { id: document.id },
          data: {
            status: "UPLOADED",
            verifiedMimeType: detectedMimeType,
            verifiedSizeBytes: fileBytes.byteLength,
            uploadedAt,
          },
        });

      return {
        status: 200,
        body: presentCompletedDocument(completed),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError({
        cause: error,
        code: "document_storage_unavailable",
        message: "The uploaded document could not be verified.",
        statusCode: 503,
        title: "Document storage unavailable",
      });
    }
  };
}

async function rejectUploadedDocument(
  dependencies: {
    database: DatabaseClient;
    objectStorage: ObjectStorage;
  },
  document: {
    id: string;
    bucket: string;
    objectKey: string;
  },
  reason: string,
): Promise<never> {
  await dependencies.database.businessClaimDocument.update({
    where: { id: document.id },
    data: {
      status: "REJECTED",
      rejectionReason: reason,
    },
  });
  await dependencies.objectStorage.removeObject(
    document.bucket,
    document.objectKey,
  );

  throw invalidDocumentError(reason);
}
