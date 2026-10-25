import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { presentBusinessClaim } from "../../business-claim.presenter.js";
import { businessClaimSelect } from "../../business-claim.select.js";
import type { submitBusinessClaimContract } from "./submit-business-claim.contract.js";

function claimConflictError(message: string): AppError {
  return new AppError({
    code: "business_claim_conflict",
    message,
    statusCode: 409,
    title: "Business claim conflict"
  });
}

export function createSubmitBusinessClaimHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof submitBusinessClaimContract> {
  return async ({ body, params, req }) => {
    const claimantUserId = requireAuthenticatedPrincipal(req, "user").subjectId;

    try {
      const claim = await dependencies.database.$transaction(
        async (transaction) => {
          const business = await transaction.business.findUnique({
            where: { id: params.businessId },
            select: {
              id: true,
              source: true,
              status: true,
              memberships: {
                where: { userId: claimantUserId },
                select: { userId: true },
                take: 1
              },
              _count: {
                select: { memberships: true }
              }
            }
          });

          if (!business) {
            throw new AppError({
              code: "business_not_found",
              message: "The requested business does not exist.",
              statusCode: 404,
              title: "Business not found"
            });
          }

          if (business.memberships.length > 0) {
            throw claimConflictError("You already manage this business.");
          }

          if (business._count.memberships > 0) {
            throw claimConflictError("This business has already been claimed.");
          }

          if (business.source === "SELF_REGISTERED") {
            throw claimConflictError("Self-registered businesses cannot be claimed through this workflow.");
          }

          if (business.status !== "APPROVED") {
            throw claimConflictError("This business is not currently available to be claimed.");
          }

          const document = await transaction.businessClaimDocument.findFirst({
            where: {
              id: body.evidenceDocumentId,
              ownerUserId: claimantUserId
            }
          });

          if (
            !document ||
            document.status !== "UPLOADED" ||
            !document.verifiedMimeType ||
            document.verifiedSizeBytes === null
          ) {
            throw claimConflictError("The evidence document is not verified or cannot be used.");
          }

          const attachedDocument = await transaction.businessClaimDocument.updateMany({
            where: {
              id: document.id,
              ownerUserId: claimantUserId,
              status: "UPLOADED"
            },
            data: {
              status: "ATTACHED",
              attachedAt: new Date()
            }
          });

          if (attachedDocument.count !== 1) {
            throw claimConflictError("The evidence document is already in use.");
          }

          return transaction.businessClaim.create({
            data: {
              businessId: business.id,
              claimantUserId,
              requestedRole: body.requestedRole,
              claimantNote: body.claimantNote?.trim() ?? null,
              evidenceDocumentId: document.id,
              evidenceDocumentKey: document.objectKey,
              evidenceDocumentOriginalName: document.originalFileName,
              evidenceDocumentMimeType: document.verifiedMimeType,
              evidenceDocumentSizeBytes: document.verifiedSizeBytes
            },
            select: businessClaimSelect
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        }
      );

      return {
        status: 201,
        body: presentBusinessClaim(claim)
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")
      ) {
        throw claimConflictError(
          "The claim, business, or evidence document changed while the request was being processed."
        );
      }

      throw error;
    }
  };
}
