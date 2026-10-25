import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

/**
 * Dashboard data spans the directory, claims, reviews, and user accounts.
 * Keep access explicit: a SUPER_ADMIN always has access, while other staff
 * need the dashboard.view permission assigned to one of their roles.
 */
export async function requireAdminDashboardViewer(options: {
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
      role.permissions.some(({ permission }) => permission.name === "dashboard.view")
  );

  if (!authorized) {
    throw new AppError({
      code: "permission_denied",
      message: "You do not have permission to view the dashboard.",
      statusCode: 403,
      title: "Permission denied"
    });
  }
}
