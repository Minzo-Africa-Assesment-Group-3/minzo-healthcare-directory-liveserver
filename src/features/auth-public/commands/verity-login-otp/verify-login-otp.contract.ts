import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const verifyLoginOtpContract = contract.mutation({
  method: "POST",
  path: "/api/v1/auth/login/verify-otp",
  strictStatusCodes: true,
  summary: "Complete login with a one-time code",
  description: "Consumes a login challenge, returns an access token, and sets a refresh-token cookie.",
  body: z.object({
    challengeId: z.string().uuid(),
    otp: z.string().regex(/^\d{4}$/),
  }),
  responses: {
    200: z.object({
      accessToken: z.string(),
      tokenType: z.literal("Bearer"),
      expiresIn: z.number().int().positive(),
      refreshTokenExpiresAt: z.string().datetime(),
      user: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        displayName: z.string(),
      }),
    }),
    401: problemDetailsSchema,
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Authentication"],
  },
});
