import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";
import { businessClaimResponseSchema, businessMembershipRoleSchema } from "../../business-claim.schemas.js";

const contract = initContract();

export const submitBusinessClaimContract = contract.mutation({
  method: "POST",
  path: "/api/v1/businesses/:businessId/claims",
  pathParams: z.object({
    businessId: z.string().uuid()
  }),
  body: z.object({
    requestedRole: businessMembershipRoleSchema,
    claimantNote: z.string().trim().min(10).max(2_000).optional(),
    evidenceDocumentId: z.string().uuid()
  }),
  strictStatusCodes: true,
  summary: "Claim an existing business listing",
  description:
    "Attaches a backend-verified private document and submits an ownership or management claim for an existing imported or administrator-created business. The claim grants no access until approved by a Minzo administrator.",
  responses: {
    201: businessClaimResponseSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema,
    409: problemDetailsSchema
  },
  metadata: {
    openApiTags: ["Business Claims"],
    authentication: "user-access-token"
  }
});
