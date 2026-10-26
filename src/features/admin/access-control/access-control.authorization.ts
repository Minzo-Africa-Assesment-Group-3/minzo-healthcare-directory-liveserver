import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

export async function requireAccessControlManager(options: {
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
            select: { name: true }
          }
        }
      }
    }
  });

  if (admin?.status !== "ACTIVE" || !admin.roles.some(({ role }) => role.name === "SUPER_ADMIN")) {
    throw new AppError({
      code: "permission_denied",
      message: "Only a super administrator can manage administrator access.",
      statusCode: 403,
      title: "Permission denied"
    });
  }
}
