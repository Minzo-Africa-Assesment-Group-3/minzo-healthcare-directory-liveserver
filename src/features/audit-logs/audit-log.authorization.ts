import type { DatabaseClient } from "../../infrastructure/database/index.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function requireAuditLogViewer(options: {
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

  if (!admin || admin.status !== "ACTIVE") {
    throw new AppError({
      code: "account_unavailable",
      message: "The authenticated account is not available.",
      statusCode: 403,
      title: "Account unavailable"
    });
  }

  const authorized = admin.roles.some(
    ({ role }) =>
      role.name === "SUPER_ADMIN" ||
      role.permissions.some(({ permission }) => permission.name === "audit_logs.read")
  );

  if (!authorized) {
    throw new AppError({
      code: "permission_denied",
      message: "You do not have permission to view audit logs.",
      statusCode: 403,
      title: "Permission denied"
    });
  }
}
