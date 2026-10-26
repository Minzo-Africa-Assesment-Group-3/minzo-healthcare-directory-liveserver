import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import type { ObjectStorage } from "../../../infrastructure/storage/index.js";
import type { AuthenticationMiddlewares } from "../../../shared/authentication/authentication.middleware.js";
import { completeClaimDocumentUploadContract } from "./commands/complete-claim-document-upload/complete-claim-document-upload.contract.js";
import { createCompleteClaimDocumentUploadHandler } from "./commands/complete-claim-document-upload/complete-claim-document-upload.handler.js";
import { requestClaimDocumentUploadContract } from "./commands/request-claim-document-upload/request-claim-document-upload.contract.js";
import { createRequestClaimDocumentUploadHandler } from "./commands/request-claim-document-upload/request-claim-document-upload.handler.js";
import { reviewBusinessClaimContract } from "./commands/review-business-claim/review-business-claim.contract.js";
import { createReviewBusinessClaimHandler } from "./commands/review-business-claim/review-business-claim.handler.js";
import { submitBusinessClaimContract } from "./commands/submit-business-claim/submit-business-claim.contract.js";
import { createSubmitBusinessClaimHandler } from "./commands/submit-business-claim/submit-business-claim.handler.js";
import { getClaimEvidenceDownloadContract } from "./queries/get-claim-evidence-download/get-claim-evidence-download.contract.js";
import { createGetClaimEvidenceDownloadHandler } from "./queries/get-claim-evidence-download/get-claim-evidence-download.handler.js";
import { getBusinessClaimContract } from "./queries/get-business-claim/get-business-claim.contract.js";
import { createGetBusinessClaimHandler } from "./queries/get-business-claim/get-business-claim.handler.js";
import { listBusinessClaimsContract } from "./queries/list-business-claims/list-business-claims.contract.js";
import { createListBusinessClaimsHandler } from "./queries/list-business-claims/list-business-claims.handler.js";
import { listMyBusinessClaimsContract } from "./queries/list-my-business-claims/list-my-business-claims.contract.js";
import { createListMyBusinessClaimsHandler } from "./queries/list-my-business-claims/list-my-business-claims.handler.js";

const contract = initContract();

export const businessClaimsContract = contract.router({
  requestDocumentUpload: requestClaimDocumentUploadContract,
  completeDocumentUpload: completeClaimDocumentUploadContract,
  submit: submitBusinessClaimContract,
  listMine: listMyBusinessClaimsContract,
  listForAdmin: listBusinessClaimsContract,
  getForAdmin: getBusinessClaimContract,
  getEvidenceDownload: getClaimEvidenceDownloadContract,
  moderate: reviewBusinessClaimContract
});

export interface BusinessClaimsRouteDependencies {
  businessClaimsBucket: string;
  database: DatabaseClient;
  objectStorage: ObjectStorage;
}

export function createBusinessClaimsHandlers(
  dependencies: BusinessClaimsRouteDependencies,
  { admin: authenticateAdmin, user: authenticateUser }: AuthenticationMiddlewares
) {
  return {
    requestDocumentUpload: {
      middleware: [authenticateUser],
      handler: createRequestClaimDocumentUploadHandler(dependencies)
    },
    completeDocumentUpload: {
      middleware: [authenticateUser],
      handler: createCompleteClaimDocumentUploadHandler(dependencies)
    },
    submit: {
      middleware: [authenticateUser],
      handler: createSubmitBusinessClaimHandler(dependencies)
    },
    listMine: {
      middleware: [authenticateUser],
      handler: createListMyBusinessClaimsHandler(dependencies)
    },
    listForAdmin: {
      middleware: [authenticateAdmin],
      handler: createListBusinessClaimsHandler(dependencies)
    },
    getForAdmin: {
      middleware: [authenticateAdmin],
      handler: createGetBusinessClaimHandler(dependencies)
    },
    getEvidenceDownload: {
      middleware: [authenticateAdmin],
      handler: createGetClaimEvidenceDownloadHandler(dependencies)
    },
    moderate: {
      middleware: [authenticateAdmin],
      handler: createReviewBusinessClaimHandler(dependencies)
    }
  };
}
