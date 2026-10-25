import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { Prisma } from "../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import type { ObjectStorage } from "../../../../infrastructure/storage/index.js";
import { requireAuthenticatedPrincipal } from "../../../../shared/authentication/route-authentication.js";
import {
  detectVerifiedDocumentMimeType,
  maximumVerifiedDocumentSizeBytes,
  type VerifiedDocumentMimeType
} from "../../../../shared/documents/verified-document.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import type { completeBusinessRegistrationDocumentUploadContract } from "./complete-document-upload.contract.js";

interface RegistrationDocument {
  id: string;
  businessId: string;
  bucket: string;
  objectKey: string;
  originalFileName: string;
  declaredMimeType: string;
  declaredSizeBytes: number;
  verifiedMimeType: string | null;
  verifiedSizeBytes: number | null;
  status: "PENDING_UPLOAD" | "ATTACHED" | "REJECTED";
  uploadedAt: Date | null;
}

function presentAttachedDocument(document: RegistrationDocument) {
  if (
    document.status !== "ATTACHED" ||
    !document.verifiedMimeType ||
    document.verifiedSizeBytes === null ||
    !document.uploadedAt
  ) {
    throw new Error("Attached registration-document metadata is incomplete.");
  }

  return {
    id: document.id,
    businessId: document.businessId,
    originalFileName: document.originalFileName,
    mimeType: document.verifiedMimeType as VerifiedDocumentMimeType,
    sizeBytes: document.verifiedSizeBytes,
    status: "ATTACHED" as const,
    uploadedAt: document.uploadedAt.toISOString()
  };
}

function documentConflictError(message: string): AppError {
  return new AppError({
    code: "business_registration_document_conflict",
    message,
    statusCode: 409,
    title: "Business registration document conflict"
  });
}

function invalidDocumentError(reason: string): AppError {
  return new AppError({
    code: "invalid_business_registration_document",
    message: reason,
    statusCode: 422,
    title: "Invalid business registration document"
  });
}

export function createCompleteBusinessRegistrationDocumentUploadHandler(dependencies: {
  database: DatabaseClient;
  objectStorage: ObjectStorage;
}): AppRouteMutationImplementation<typeof completeBusinessRegistrationDocumentUploadContract> {
  return async ({ params, req }) => {
    const ownerUserId = requireAuthenticatedPrincipal(req, "user").subjectId;
    const document = await dependencies.database.businessRegistrationDocument.findFirst({
      where: {
        id: params.documentId,
        ownerUserId,
        business: {
          memberships: { some: { userId: ownerUserId } }
        }
      }
    });

    if (!document) {
      throw new AppError({
        code: "business_registration_document_not_found",
        message: "The requested registration document does not exist.",
        statusCode: 404,
        title: "Business registration document not found"
      });
    }

    if (document.status === "ATTACHED") {
      return {
        status: 200,
        body: presentAttachedDocument(document)
      };
    }

    if (document.status === "REJECTED") {
      throw documentConflictError("This registration document was rejected and cannot be reused.");
    }

    const verified = await verifyStoredDocument(dependencies, document);
    const uploadedAt = new Date();

    try {
      await dependencies.database.$transaction(
        async (transaction) => {
          const updatedBusiness = await transaction.business.updateMany({
            where: {
              id: document.businessId,
              registrationDocumentKey: null
            },
            data: {
              registrationDocumentKey: document.objectKey,
              registrationDocumentOriginalName: document.originalFileName,
              registrationDocumentMimeType: verified.mimeType,
              registrationDocumentSizeBytes: verified.sizeBytes,
              registrationDocumentUploadedAt: uploadedAt
            }
          });

          if (updatedBusiness.count !== 1) {
            throw documentConflictError("The business already has a registration document.");
          }

          const attachedDocument = await transaction.businessRegistrationDocument.updateMany({
            where: {
              id: document.id,
              ownerUserId,
              status: "PENDING_UPLOAD"
            },
            data: {
              status: "ATTACHED",
              verifiedMimeType: verified.mimeType,
              verifiedSizeBytes: verified.sizeBytes,
              uploadedAt,
              attachedAt: uploadedAt
            }
          });

          if (attachedDocument.count !== 1) {
            throw documentConflictError("The registration document changed while it was being verified.");
          }
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        }
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")
      ) {
        throw documentConflictError(
          "The business or registration document changed while it was being processed."
        );
      }

      throw error;
    }

    return {
      status: 200,
      body: {
        id: document.id,
        businessId: document.businessId,
        originalFileName: document.originalFileName,
        mimeType: verified.mimeType,
        sizeBytes: verified.sizeBytes,
        status: "ATTACHED",
        uploadedAt: uploadedAt.toISOString()
      }
    };
  };
}

async function verifyStoredDocument(
  dependencies: {
    database: DatabaseClient;
    objectStorage: ObjectStorage;
  },
  document: RegistrationDocument
): Promise<{
  mimeType: VerifiedDocumentMimeType;
  sizeBytes: number;
}> {
  try {
    const exists = await dependencies.objectStorage.objectExists(document.bucket, document.objectKey);

    if (!exists) {
      throw documentConflictError("The registration document has not been uploaded yet.");
    }

    const objectInfo = await dependencies.objectStorage.getObjectInfo(document.bucket, document.objectKey);

    if (
      objectInfo.sizeBytes > maximumVerifiedDocumentSizeBytes ||
      objectInfo.sizeBytes !== document.declaredSizeBytes
    ) {
      await rejectUploadedDocument(
        dependencies,
        document,
        "The uploaded file size does not match the authorized upload."
      );
    }

    const fileBytes = await dependencies.objectStorage.downloadObject(document.bucket, document.objectKey);
    const detectedMimeType = detectVerifiedDocumentMimeType(fileBytes);

    if (detectedMimeType === null) {
      await rejectUploadedDocument(
        dependencies,
        document,
        "The uploaded file content does not match a supported document type."
      );

      throw new Error("Rejected document validation unexpectedly returned.");
    }

    if (
      fileBytes.byteLength !== document.declaredSizeBytes ||
      detectedMimeType !== document.declaredMimeType
    ) {
      await rejectUploadedDocument(
        dependencies,
        document,
        "The uploaded file content does not match its declared type or size."
      );
    }

    return {
      mimeType: detectedMimeType,
      sizeBytes: fileBytes.byteLength
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError({
      cause: error,
      code: "document_storage_unavailable",
      message: "The uploaded registration document could not be verified.",
      statusCode: 503,
      title: "Document storage unavailable"
    });
  }
}

async function rejectUploadedDocument(
  dependencies: {
    database: DatabaseClient;
    objectStorage: ObjectStorage;
  },
  document: RegistrationDocument,
  reason: string
): Promise<never> {
  await dependencies.database.businessRegistrationDocument.update({
    where: { id: document.id },
    data: {
      status: "REJECTED",
      rejectionReason: reason
    }
  });
  await dependencies.objectStorage.removeObject(document.bucket, document.objectKey);

  throw invalidDocumentError(reason);
}
