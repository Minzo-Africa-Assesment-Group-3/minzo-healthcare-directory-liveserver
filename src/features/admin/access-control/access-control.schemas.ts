import { z } from "zod";

export const adminPermissionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable()
});

export const adminRoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  isSystem: z.boolean(),
  permissions: z.array(adminPermissionSchema)
});

export const administratorAccessSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  email: z.string().email(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]),
  roles: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string()
    })
  )
});
