import "dotenv/config";

import { z } from "zod";

import { createDatabaseClient } from "../infrastructure/database/index.js";
import { adminPermissionCatalog } from "../features/admin/access-control/admin-permission-catalog.js";
import { hashPassword } from "../shared/authentication/password-hasher.js";

const seedEnvironmentSchema = z.object({
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required."),
  SUPER_ADMIN_EMAIL: z.string().trim().email().max(320),
  SUPER_ADMIN_DISPLAY_NAME: z.string().trim().min(2).max(100),
  SUPER_ADMIN_PASSWORD: z.string().min(12).max(128)
});

const environment = seedEnvironmentSchema.parse(process.env);
const database = createDatabaseClient(environment.DATABASE_URL);
const passwordHash = await hashPassword(environment.SUPER_ADMIN_PASSWORD);
const now = new Date();

try {
  const result = await database.$transaction(async (transaction) => {
    await Promise.all(
      adminPermissionCatalog.map((permission) =>
        transaction.adminPermission.upsert({
          where: { name: permission.name },
          update: { description: permission.description },
          create: permission
        })
      )
    );

    const role = await transaction.adminRole.upsert({
      where: { name: "SUPER_ADMIN" },
      update: {
        description: "Full administrative access to the Minzo platform."
      },
      create: {
        name: "SUPER_ADMIN",
        description: "Full administrative access to the Minzo platform."
      }
    });

    const admin = await transaction.adminUser.upsert({
      where: { email: environment.SUPER_ADMIN_EMAIL.toLowerCase() },
      update: {
        displayName: environment.SUPER_ADMIN_DISPLAY_NAME,
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: now,
        deactivatedAt: null
      },
      create: {
        email: environment.SUPER_ADMIN_EMAIL.toLowerCase(),
        displayName: environment.SUPER_ADMIN_DISPLAY_NAME,
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: now
      }
    });

    await transaction.adminUserRole.upsert({
      where: {
        adminUserId_roleId: {
          adminUserId: admin.id,
          roleId: role.id
        }
      },
      update: {},
      create: {
        adminUserId: admin.id,
        roleId: role.id
      }
    });

    return {
      adminId: admin.id,
      email: admin.email,
      role: role.name
    };
  });

  console.info("Super administrator seed completed.");
  console.table(result);
} finally {
  await database.$disconnect();
}
