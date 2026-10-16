import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const loginContract = contract.mutation({
  method: "POST",
  path: "/api/v1/auth/login",
  strictStatusCodes: true,
  summary: "Begin an email and password login",
  description: "Validates the password and sends a one-time code to the verified email address.",
  body: z.object({
    email: z.string().trim().email().max(320),
    password: z.string().min(1).max(128),
  }),
  responses: {
    202: z.object({
      challengeId: z.string().uuid(),
      expiresAt: z.string().datetime(),
      maskedEmail: z.string(),
      message: z.string(),
    }),
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    503: problemDetailsSchema,
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Authentication"],
  },
});
