import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

const followBusinessResponseSchema = z.object({
  businessId: z.string().uuid(),
  following: z.literal(true)
});

export const followBusinessContract = contract.mutation({
  method: "POST",
  path: "/api/v1/businesses/:businessId/follow",
  pathParams: z.object({ businessId: z.string().uuid() }),
  body: contract.noBody(),
  strictStatusCodes: true,
  summary: "Follow a business",
  description:
    "Creates an idempotent follow relationship between the authenticated user and an approved business.",
  responses: {
    200: followBusinessResponseSchema,
    401: problemDetailsSchema,
    404: problemDetailsSchema
  },
  metadata: {
    authentication: "user-access-token",
    openApiTags: ["Business Follows"]
  }
});
