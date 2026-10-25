import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const getClaimEvidenceDownloadContract = contract.query({
  method: "GET",
  path: "/api/v1/admin/business-claims/:claimId/evidence-download-url",
  pathParams: z.object({
    claimId: z.string().uuid()
  }),
  strictStatusCodes: true,
  summary: "Create a claim-evidence download URL",
  description:
    "Returns a short-lived signed URL for an authorized Minzo administrator to inspect private claim evidence.",
  responses: {
    200: z.object({
      url: z.string().url(),
      expiresAt: z.string().datetime()
    }),
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema,
    409: problemDetailsSchema,
    503: problemDetailsSchema
  },
  metadata: {
    openApiTags: ["Admin Business Claims"],
    authentication: "admin-access-token"
  }
});
