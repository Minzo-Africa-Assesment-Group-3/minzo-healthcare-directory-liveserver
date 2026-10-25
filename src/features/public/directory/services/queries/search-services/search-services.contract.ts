import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const serviceSuggestionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string()
});

export const searchServicesContract = contract.query({
  method: "GET",
  path: "/api/v1/services",
  query: z.object({
    search: z.string().trim().min(2).max(150),
    limit: z.coerce.number().int().min(1).max(20).default(10)
  }),
  strictStatusCodes: true,
  summary: "Search the service catalogue",
  description:
    "Returns a small, alphabetically ordered list of existing services for registration and service-management autocomplete fields.",
  responses: {
    200: z.object({
      data: z.array(serviceSuggestionSchema)
    }),
    400: problemDetailsSchema
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Services"]
  }
});
