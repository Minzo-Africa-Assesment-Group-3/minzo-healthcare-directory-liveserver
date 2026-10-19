import "dotenv/config";

import { z } from "zod";

import { createDatabaseClient } from "../infrastructure/database/index.js";
import { seedLiberiaHealthcareDirectory } from "./liberia-healthcare-database-seeder.js";
import { loadLiberiaHealthcareSeedFixture } from "./liberia-healthcare-seed-fixture.js";

const databaseUrl = z
  .string()
  .min(1, "DATABASE_URL is required to seed the database.")
  .parse(process.env.DATABASE_URL);

const database = createDatabaseClient(databaseUrl);

try {
  const fixture = await loadLiberiaHealthcareSeedFixture();
  const result = await seedLiberiaHealthcareDirectory(database, fixture);

  console.info("Liberia healthcare directory seed completed.");
  console.table(result);
} finally {
  await database.$disconnect();
}
