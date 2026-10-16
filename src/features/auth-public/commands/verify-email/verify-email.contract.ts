import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const verifyEmailContract = contract.mutation({
  method: "POST",
  path: "/api/v1/auth/verify-email",
  strictStatusCodes: true,
  summary: "Verify an email address",
  description: "Consumes a single-use email verification token and activates the account.",
  body: z.object({
    token: z.string().trim().min(32).max(256),
  }),
  responses: {
    200: z.object({
      verified: z.literal(true),
      email: z.string().email(),
    }),
    400: problemDetailsSchema,
    410: problemDetailsSchema,
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Authentication"],
  },
});
