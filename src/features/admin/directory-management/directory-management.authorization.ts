import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

export async function requireDirectoryManager(options: {
  adminUserId: string;
  database: DatabaseClient;
}): Promise<void> {
  const admin = await options.database.adminUser.findUnique({
    where: { id: options.adminUserId },
    select: {
      status: true,
      roles: {
        select: {
          role: {
            select: {
              name: true,
              permissions: {
                select: { permission: { select: { name: true } } }
              }
            }
          }
        }
      }
    }
  });

  const authorized =
    admin?.status === "ACTIVE" &&
    admin.roles.some(
      ({ role }) =>
        role.name === "SUPER_ADMIN" ||
        role.permissions.some(({ permission }) => permission.name === "directory.manage")
    );

  if (!authorized) {
    throw new AppError({
      code: "permission_denied",
      message: "You do not have permission to manage counties and cities.",
      statusCode: 403,
      title: "Permission denied"
    });
  }
}
