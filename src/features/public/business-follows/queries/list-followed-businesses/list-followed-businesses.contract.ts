import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import { paginatedResponseSchema, paginationQuerySchema } from "../../../../../shared/pagination/index.js";

export const listFollowedBusinessesContract = initContract().query({
  method: "GET",
  path: "/api/v1/me/followed-businesses",
  query: paginationQuerySchema.strict(),
  strictStatusCodes: true,
  summary: "List businesses I follow",
  description:
    "Lists your followed, approved businesses, most recently followed first. Hidden businesses are excluded.",
  responses: {
    200: paginatedResponseSchema(
      z.object({
        business: z.object({
          id: z.string().uuid(),
          displayName: z.string(),
          slug: z.string()
        }),
        followedAt: z.string().datetime()
      })
    ),
    401: problemDetailsSchema,
    403: problemDetailsSchema
  },
  metadata: {
    authentication: "user-access-token",
    openApiTags: ["Business Follows"]
  }
});
