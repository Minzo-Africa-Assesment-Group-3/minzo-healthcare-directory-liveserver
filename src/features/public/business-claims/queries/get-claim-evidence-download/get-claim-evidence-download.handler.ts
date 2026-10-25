import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import type { ObjectStorage } from "../../../../../infrastructure/storage/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { requireBusinessClaimsAdmin } from "../../business-claim.authorization.js";
import type { getClaimEvidenceDownloadContract } from "./get-claim-evidence-download.contract.js";

const signedDownloadLifetimeSeconds = 5 * 60;

export function createGetClaimEvidenceDownloadHandler(dependencies: {
  database: DatabaseClient;
  objectStorage: ObjectStorage;
}): AppRouteQueryImplementation<typeof getClaimEvidenceDownloadContract> {
  return async ({ params, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireBusinessClaimsAdmin({
      adminUserId,
      database: dependencies.database
    });
    const claim = await dependencies.database.businessClaim.findUnique({
      where: { id: params.claimId },
      select: {
        evidenceDocument: {
          select: {
            bucket: true,
            objectKey: true,
            status: true
          }
        }
      }
    });

    if (!claim) {
      throw new AppError({
        code: "business_claim_not_found",
        message: "The requested business claim does not exist.",
        statusCode: 404,
        title: "Business claim not found"
      });
    }

    if (!claim.evidenceDocument || claim.evidenceDocument.status !== "ATTACHED") {
      throw new AppError({
        code: "claim_evidence_unavailable",
        message: "Verified evidence is not available for this claim.",
        statusCode: 409,
        title: "Claim evidence unavailable"
      });
    }

    try {
      const authorization = await dependencies.objectStorage.createSignedDownloadAuthorization(
        claim.evidenceDocument.bucket,
        claim.evidenceDocument.objectKey,
        signedDownloadLifetimeSeconds
      );
      const expiresAt = new Date(Date.now() + signedDownloadLifetimeSeconds * 1_000);

      return {
        status: 200,
        body: {
          url: authorization.signedUrl,
          expiresAt: expiresAt.toISOString()
        }
      };
    } catch (cause) {
      throw new AppError({
        cause,
        code: "document_storage_unavailable",
        message: "A document download URL could not be created.",
        statusCode: 503,
        title: "Document storage unavailable"
      });
    }
  };
}
