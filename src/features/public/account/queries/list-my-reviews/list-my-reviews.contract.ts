import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";
import { paginatedResponseSchema, paginationQuerySchema } from "../../../../../shared/pagination/index.js";

export const listMyReviewsContract = initContract().query({
  method: "GET",
  path: "/api/v1/me/reviews",
  query: paginationQuerySchema.strict(),
  strictStatusCodes: true,
  summary: "List my recent reviews",
  description:
    "Returns only the signed-in user's reviews, newest first, including hidden reviews. Deleted reviews are excluded.",
  responses: {
    200: paginatedResponseSchema(
      z.object({
        id: z.string().uuid(),
        business: z.object({ id: z.string().uuid(), displayName: z.string(), slug: z.string() }),
        stars: z.number().int().min(1).max(5),
        text: z.string(),
        isAnonymous: z.boolean(),
        publicationStatus: z.enum(["PUBLISHED", "HIDDEN"]),
        moderationStatus: z.enum(["UNREVIEWED", "APPROVED", "FLAGGED", "REJECTED"]),
        submittedAt: z.string().datetime(),
        updatedAt: z.string().datetime()
      })
    ),
    401: problemDetailsSchema,
    403: problemDetailsSchema
  },
  metadata: { authentication: "user-access-token", openApiTags: ["My Account"] }
});
