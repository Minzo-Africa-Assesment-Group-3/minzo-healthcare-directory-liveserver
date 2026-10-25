import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

const contract = initContract();

export const acceptAdminInvitationContract = contract.mutation({
  method: "POST",
  path: "/api/v1/admin/invitations/accept",
  strictStatusCodes: true,
  summary: "Accept an administrator invitation",
  description: "Creates the invited administrator account after validating the one-time invitation token.",
  body: z.object({
    password: z.string().min(12).max(128),
    token: z.string().min(40).max(200)
  }),
  responses: {
    201: z.object({
      admin: z.object({
        displayName: z.string(),
        email: z.string().email(),
        id: z.string().uuid(),
        roles: z.array(z.string())
      }),
      message: z.string()
    }),
    400: problemDetailsSchema,
    409: problemDetailsSchema,
    410: problemDetailsSchema
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Admin Invitations"]
  }
});
