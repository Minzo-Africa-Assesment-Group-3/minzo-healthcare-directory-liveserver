import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const verifyAdminLoginOtpContract = contract.mutation({
  method: "POST",
  path: "/api/v1/admin/auth/login/verify-otp",
  strictStatusCodes: true,
  summary: "Complete an administrator login",
  description: "Consumes an administrator login challenge and creates an admin session.",
  body: z.object({
    challengeId: z.string().uuid(),
    otp: z.string().regex(/^\d{6}$/)
  }),
  responses: {
    200: z.object({
      accessToken: z.string(),
      tokenType: z.literal("Bearer"),
      expiresIn: z.number().int().positive(),
      refreshTokenExpiresAt: z.string().datetime(),
      admin: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        displayName: z.string(),
        roles: z.array(z.string())
      })
    }),
    401: problemDetailsSchema
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Admin Authentication"]
  }
});
