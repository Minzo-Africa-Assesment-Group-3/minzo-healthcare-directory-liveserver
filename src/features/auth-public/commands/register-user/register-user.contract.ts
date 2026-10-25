import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const registerUserContract = contract.mutation({
  method: "POST",
  path: "/api/v1/auth/register/user",
  strictStatusCodes: true,
  summary: "Register a public user",
  description: "Creates a public user account and sends an email verification link.",
  body: z.object({
    email: z.string().trim().email().max(320),
    password: z.string().min(12).max(128),
    displayName: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(7).max(30).optional()
  }),
  responses: {
    201: z.object({
      message: z.string(),
      user: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        displayName: z.string(),
        phone: z.string().nullable(),
        status: z.literal("PENDING_VERIFICATION"),
        createdAt: z.string().datetime()
      })
    }),
    409: problemDetailsSchema,
    503: problemDetailsSchema
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Authentication"]
  }
});
