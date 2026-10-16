import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";
import { requestBusinessRegistrationDocumentUploadBodySchema } from "../../business-registration-document.schemas.js";

const contract = initContract();

export const requestBusinessRegistrationDocumentUploadContract =
  contract.mutation({
    method: "POST",
    path: "/api/v1/businesses/:businessId/registration-document/upload-url",
    pathParams: z.object({
      businessId: z.string().uuid(),
    }),
    body: requestBusinessRegistrationDocumentUploadBodySchema,
    strictStatusCodes: true,
    summary: "Authorize a business-registration document upload",
    description:
      "Creates a pending private-document record and returns a short-lived Supabase signed upload token for a business member.",
    responses: {
      201: z.object({
        documentId: z.string().uuid(),
        bucket: z.string(),
        path: z.string(),
        token: z.string(),
        expiresAt: z.string().datetime(),
      }),
      401: problemDetailsSchema,
      403: problemDetailsSchema,
      404: problemDetailsSchema,
      409: problemDetailsSchema,
      503: problemDetailsSchema,
    },
    metadata: {
      openApiTags: ["Business Registration Documents"],
      authentication: "user-access-token",
    },
  });
