import "dotenv/config";

import { z } from "zod";

import { adminPermissionCatalog } from "../features/admin/access-control/admin-permission-catalog.js";
import { createDatabaseClient } from "../infrastructure/database/index.js";

const environment = z
  .object({
    DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required.")
  })
  .parse(process.env);

const database = createDatabaseClient(environment.DATABASE_URL);

try {
  await Promise.all(
    adminPermissionCatalog.map((permission) =>
      database.adminPermission.upsert({
        where: { name: permission.name },
        update: { description: permission.description },
        create: permission
      })
    )
  );

  console.info(`Seeded ${adminPermissionCatalog.length} administrator permissions.`);
} finally {
  await database.$disconnect();
}
