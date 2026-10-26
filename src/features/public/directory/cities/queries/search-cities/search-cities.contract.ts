import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const citySuggestionSchema = z.object({
  id: z.string().uuid(),
  countyId: z.string().uuid(),
  name: z.string(),
  slug: z.string()
});

export const searchCitiesContract = contract.query({
  method: "GET",
  path: "/api/v1/cities",
  query: z.object({
    countyId: z.string().uuid().optional(),
    search: z.string().trim().min(2).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional()
  }),
  strictStatusCodes: true,
  summary: "List or search the city catalogue",
  description:
    "Returns a small, alphabetically ordered list of active cities or towns, optionally filtered by county and search text.",
  responses: {
    200: z.object({
      data: z.array(citySuggestionSchema)
    }),
    400: problemDetailsSchema
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Cities"]
  }
});
