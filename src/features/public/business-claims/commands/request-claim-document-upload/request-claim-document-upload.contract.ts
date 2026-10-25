import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import { requestClaimDocumentUploadBodySchema } from "../../business-claim-document.schemas.js";

const contract = initContract();

export const requestClaimDocumentUploadContract = contract.mutation({
  method: "POST",
  path: "/api/v1/business-claim-documents/upload-url",
  body: requestClaimDocumentUploadBodySchema,
  strictStatusCodes: true,
  summary: "Authorize a business-claim document upload",
  description:
    "Creates a pending private-document record and returns a short-lived Supabase signed upload token for a server-generated object path.",
  responses: {
    201: z.object({
      documentId: z.string().uuid(),
      bucket: z.string(),
      path: z.string(),
      token: z.string(),
      expiresAt: z.string().datetime()
    }),
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    503: problemDetailsSchema
  },
  metadata: {
    openApiTags: ["Business Claims"],
    authentication: "user-access-token"
  }
});
