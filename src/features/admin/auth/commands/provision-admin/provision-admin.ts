import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { hashPassword } from "../../../../../shared/authentication/index.js";

export interface ProvisionAdminInput {
  displayName: string;
  email: string;
  password: string;
}

export interface ProvisionedAdmin {
  displayName: string;
  email: string;
  id: string;
  role: "SUPER_ADMIN";
}

export async function provisionAdmin(
  database: DatabaseClient,
  input: ProvisionAdminInput
): Promise<ProvisionedAdmin> {
  const email = input.email.trim().toLowerCase();
  const existingAdmin = await database.adminUser.findUnique({
    where: { email },
    select: { id: true }
  });

  if (existingAdmin) {
    throw new Error("An administrator with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);

  return database.$transaction(async (transaction) => {
    const superAdminRole = await transaction.adminRole.upsert({
      where: { name: "SUPER_ADMIN" },
      update: {},
      create: {
        name: "SUPER_ADMIN",
        description: "Full access to the Minzo Africa administration portal."
      },
      select: { id: true }
    });

    const admin = await transaction.adminUser.create({
      data: {
        email,
        passwordHash,
        displayName: input.displayName.trim(),
        emailVerifiedAt: new Date(),
        roles: {
          create: { roleId: superAdminRole.id }
        }
      },
      select: {
        id: true,
        email: true,
        displayName: true
      }
    });

    return {
      ...admin,
      role: "SUPER_ADMIN" as const
    };
  });
}
