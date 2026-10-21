import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";
import { completedClaimDocumentSchema } from "../../business-claim-document.schemas.js";

const contract = initContract();

export const completeClaimDocumentUploadContract = contract.mutation({
  method: "POST",
  path: "/api/v1/business-claim-documents/:documentId/complete",
  pathParams: z.object({
    documentId: z.string().uuid(),
  }),
  body: contract.noBody(),
  strictStatusCodes: true,
  summary: "Verify a business-claim document upload",
  description:
    "Verifies the uploaded object's ownership, size, and file signature before making it available to a business claim.",
  responses: {
    200: completedClaimDocumentSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema,
    409: problemDetailsSchema,
    422: problemDetailsSchema,
    503: problemDetailsSchema,
  },
  metadata: {
    openApiTags: ["Business Claims"],
    authentication: "user-access-token",
  },
});
