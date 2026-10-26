import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import { adminBusinessClaimResponseSchema } from "../../business-claim.schemas.js";

const contract = initContract();

export const getBusinessClaimContract = contract.query({
  method: "GET",
  path: "/api/v1/admin/business-claims/:claimId",
  pathParams: z.object({ claimId: z.string().uuid() }),
  strictStatusCodes: true,
  summary: "Get a business claim",
  description: "Returns one business ownership claim for authorized Minzo administrators.",
  responses: {
    200: adminBusinessClaimResponseSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema
  },
  metadata: {
    openApiTags: ["Admin Business Claims"],
    authentication: "admin-access-token"
  }
});
