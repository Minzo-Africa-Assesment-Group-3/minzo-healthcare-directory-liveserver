import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import type { ObjectStorage } from "../../../infrastructure/storage/index.js";
import type { AuthenticationMiddlewares } from "../../../shared/authentication/authentication.middleware.js";
import { completeBusinessRegistrationDocumentUploadContract } from "./commands/complete-document-upload/complete-document-upload.contract.js";
import { createCompleteBusinessRegistrationDocumentUploadHandler } from "./commands/complete-document-upload/complete-document-upload.handler.js";
import { requestBusinessRegistrationDocumentUploadContract } from "./commands/request-document-upload/request-document-upload.contract.js";
import { createRequestBusinessRegistrationDocumentUploadHandler } from "./commands/request-document-upload/request-document-upload.handler.js";

const contract = initContract();

export const businessRegistrationDocumentsContract = contract.router({
  requestUpload: requestBusinessRegistrationDocumentUploadContract,
  completeUpload: completeBusinessRegistrationDocumentUploadContract
});

export interface BusinessRegistrationDocumentsRouteDependencies {
  businessRegistrationsBucket: string;
  database: DatabaseClient;
  objectStorage: ObjectStorage;
}

export function createBusinessRegistrationDocumentsHandlers(
  dependencies: BusinessRegistrationDocumentsRouteDependencies,
  { user: authenticateUser }: AuthenticationMiddlewares
) {
  return {
    requestUpload: {
      middleware: [authenticateUser],
      handler: createRequestBusinessRegistrationDocumentUploadHandler(dependencies)
    },
    completeUpload: {
      middleware: [authenticateUser],
      handler: createCompleteBusinessRegistrationDocumentUploadHandler(dependencies)
    }
  };
}
