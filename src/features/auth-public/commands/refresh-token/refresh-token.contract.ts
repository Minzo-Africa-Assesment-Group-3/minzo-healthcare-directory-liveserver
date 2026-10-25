import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const refreshTokenContract = contract.mutation({
  method: "POST",
  path: "/api/v1/auth/refresh",
  strictStatusCodes: true,
  summary: "Refresh an authenticated session",
  description: "Rotates the refresh-token cookie and returns a new access token.",
  body: contract.noBody(),
  responses: {
    200: z.object({
      accessToken: z.string(),
      tokenType: z.literal("Bearer"),
      expiresIn: z.number().int().positive(),
      refreshTokenExpiresAt: z.string().datetime()
    }),
    401: problemDetailsSchema
  },
  metadata: {
    authentication: "user-refresh-token",
    openApiTags: ["Authentication"]
  }
});
