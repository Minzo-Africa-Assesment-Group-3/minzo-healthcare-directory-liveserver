import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const resetPasswordContract = contract.mutation({
  method: "POST",
  path: "/api/v1/auth/reset-password",
  strictStatusCodes: true,
  summary: "Reset a password with a one-time link",
  description:
    "Consumes a valid password-reset token, changes the password, and signs out existing sessions.",
  body: z.object({
    token: z.string().trim().min(1).max(256),
    password: z.string().min(12).max(128)
  }),
  responses: {
    200: z.object({
      message: z.string()
    }),
    400: problemDetailsSchema,
    410: problemDetailsSchema
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Authentication"]
  }
});
