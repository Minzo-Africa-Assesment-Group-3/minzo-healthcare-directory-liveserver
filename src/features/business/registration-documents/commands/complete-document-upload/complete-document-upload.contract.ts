import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import { completedBusinessRegistrationDocumentSchema } from "../../business-registration-document.schemas.js";

const contract = initContract();

export const completeBusinessRegistrationDocumentUploadContract = contract.mutation({
  method: "POST",
  path: "/api/v1/business-registration-documents/:documentId/complete",
  pathParams: z.object({
    documentId: z.string().uuid()
  }),
  body: contract.noBody(),
  strictStatusCodes: true,
  summary: "Verify and attach a business-registration document",
  description:
    "Verifies the uploaded object's ownership, size, and file signature before attaching it to the pending business.",
  responses: {
    200: completedBusinessRegistrationDocumentSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema,
    409: problemDetailsSchema,
    422: problemDetailsSchema,
    503: problemDetailsSchema
  },
  metadata: {
    openApiTags: ["Business Registration Documents"],
    authentication: "user-access-token"
  }
});
