import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const countySuggestionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

export const searchCountiesContract = contract.query({
  method: "GET",
  path: "/api/v1/counties",
  query: z.object({
    search: z.string().trim().min(2).max(100),
    limit: z.coerce.number().int().min(1).max(20).default(10),
  }),
  strictStatusCodes: true,
  summary: "Search the county catalogue",
  description:
    "Returns a small, alphabetically ordered list of active Liberian counties for autocomplete fields.",
  responses: {
    200: z.object({
      data: z.array(countySuggestionSchema),
    }),
    400: problemDetailsSchema,
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Counties"],
  },
});
