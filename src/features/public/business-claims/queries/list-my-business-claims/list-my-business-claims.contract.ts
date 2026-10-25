import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import { businessClaimResponseSchema } from "../../business-claim.schemas.js";

const contract = initContract();

export const listMyBusinessClaimsContract = contract.query({
  method: "GET",
  path: "/api/v1/business-claims/mine",
  strictStatusCodes: true,
  summary: "List my business claims",
  description: "Returns business claims submitted by the authenticated public user.",
  responses: {
    200: z.object({ data: z.array(businessClaimResponseSchema) }),
    401: problemDetailsSchema,
    403: problemDetailsSchema
  },
  metadata: {
    openApiTags: ["Business Claims"],
    authentication: "user-access-token"
  }
});
