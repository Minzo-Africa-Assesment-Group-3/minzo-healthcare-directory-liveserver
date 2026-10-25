import { initContract } from "@ts-rest/core";
import { z } from "zod";

const contract = initContract();

export const requestPasswordResetContract = contract.mutation({
  method: "POST",
  path: "/api/v1/auth/forgot-password",
  strictStatusCodes: true,
  summary: "Request a password reset link",
  description: "Sends a one-time password-reset link when an eligible account exists.",
  body: z.object({
    email: z.string().trim().email().max(320)
  }),
  responses: {
    202: z.object({
      message: z.string()
    })
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Authentication"]
  }
});
