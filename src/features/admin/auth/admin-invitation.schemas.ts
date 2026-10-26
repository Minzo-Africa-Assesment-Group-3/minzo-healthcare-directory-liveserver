import { z } from "zod";

export const adminInvitationStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "REVOKED"
]);

export const adminInvitationSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  email: z.string().email(),
  status: adminInvitationStatusSchema,
  expiresAt: z.string().datetime(),
  acceptedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  role: z.object({
    id: z.string().uuid(),
    name: z.string()
  }),
  invitedBy: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    email: z.string().email()
  })
});
