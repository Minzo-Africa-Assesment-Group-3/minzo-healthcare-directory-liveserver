import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";
import {
  paginatedResponseSchema,
  paginationQuerySchema,
} from "../../../../shared/pagination/index.js";

const contract = initContract();

const managedBusinessFeedbackSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  stars: z.number().int().min(1).max(5),
  text: z.string(),
  isAnonymous: z.boolean(),
  author: z.object({ displayName: z.string() }).nullable(),
  publicationStatus: z.enum(["PUBLISHED", "HIDDEN"]),
  moderationStatus: z.enum([
    "UNREVIEWED",
    "APPROVED",
    "FLAGGED",
    "REJECTED",
  ]),
  submittedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastModeration: z
    .object({
      decision: z.enum(["APPROVED", "FLAGGED", "REJECTED"]),
      reason: z.string().nullable(),
      createdAt: z.string().datetime(),
    })
    .nullable(),
});

export const listManagedBusinessFeedbackContract = contract.query({
  method: "GET",
  path: "/api/v1/businesses/:businessId/customer-reviews",
  pathParams: z.object({ businessId: z.string().uuid() }),
  query: paginationQuerySchema.extend({
    moderationStatus: z
      .enum(["UNREVIEWED", "APPROVED", "FLAGGED", "REJECTED"])
      .optional(),
    publicationStatus: z.enum(["PUBLISHED", "HIDDEN"]).optional(),
    stars: z.coerce.number().int().min(1).max(5).optional(),
    search: z.string().trim().min(1).max(200).optional(),
    sort: z
      .enum(["NEWEST", "OLDEST", "RATING_HIGH", "RATING_LOW"])
      .default("NEWEST"),
  }),
  strictStatusCodes: true,
  summary: "List business customer reviews",
  description:
    "Returns the customer-review dashboard for an authenticated business owner or manager. Anonymous customer identities remain private.",
  responses: {
    200: paginatedResponseSchema(managedBusinessFeedbackSchema),
    401: problemDetailsSchema,
    403: problemDetailsSchema,
  },
  metadata: {
    authentication: "user-access-token",
    openApiTags: ["Business Customer Reviews"],
  },
});
