import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const resendVerificationContract = contract.mutation({
  method: "POST",
  path: "/api/v1/auth/resend-verification",
  strictStatusCodes: true,
  summary: "Resend an email verification link",
  description: "Creates a replacement verification token for an eligible unverified account.",
  body: z.object({
    email: z.string().trim().email().max(320)
  }),
  responses: {
    202: z.object({
      message: z.string()
    }),
    503: problemDetailsSchema
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Authentication"]
  }
});
