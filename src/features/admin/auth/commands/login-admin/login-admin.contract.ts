import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const loginAdminContract = contract.mutation({
  method: "POST",
  path: "/api/v1/admin/auth/login",
  strictStatusCodes: true,
  summary: "Begin an administrator login",
  description: "Validates an administrator's credentials and sends a one-time code.",
  body: z.object({
    email: z.string().trim().email().max(320),
    password: z.string().min(1).max(128)
  }),
  responses: {
    202: z.object({
      challengeId: z.string().uuid(),
      expiresAt: z.string().datetime(),
      maskedEmail: z.string(),
      message: z.string()
    }),
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    503: problemDetailsSchema
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Admin Authentication"]
  }
});
