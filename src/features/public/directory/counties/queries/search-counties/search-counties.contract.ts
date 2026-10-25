import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const countySuggestionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string()
});

export const searchCountiesContract = contract.query({
  method: "GET",
  path: "/api/v1/counties",
  query: z.object({
    search: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().trim().min(2).max(100).optional()
    ),
    limit: z.coerce.number().int().min(1).max(20).optional()
  }),
  strictStatusCodes: true,
  summary: "List or search the county catalogue",
  description:
    "Returns all active Liberian counties alphabetically when search is omitted or blank. " +
    "A non-empty search must contain at least two characters and defaults to 10 matching results. " +
    "An explicit limit (1-20) applies to either mode.",
  responses: {
    200: z.object({
      data: z.array(countySuggestionSchema)
    }),
    400: problemDetailsSchema
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Counties"]
  }
});
