import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

export const followBusinessContract = initContract().mutation({
  method: "PUT",
  path: "/api/v1/businesses/:businessId/follow",
  pathParams: z.object({ businessId: z.string().uuid() }),
  body: z.object({}).strict(),
  strictStatusCodes: true,
  summary: "Follow a business",
  description: "Follows an approved business. Repeated requests do not create duplicate follows.",
  responses: {
    200: z.object({
      businessId: z.string().uuid(),
      following: z.literal(true)
    }),
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    404: problemDetailsSchema
  },
  metadata: {
    authentication: "user-access-token",
    openApiTags: ["Business Follows"]
  }
});
