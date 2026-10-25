import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

function accountUnavailableError(): AppError {
  return new AppError({
    code: "account_unavailable",
    message: "The authenticated account is not available.",
    statusCode: 403,
    title: "Account unavailable"
  });
}

export async function requireBusinessClaimsAdmin(options: {
  adminUserId: string;
  database: DatabaseClient;
}): Promise<string> {
  const admin = await options.database.adminUser.findUnique({
    where: { id: options.adminUserId },
    select: {
      id: true,
      status: true,
      roles: {
        select: {
          role: {
            select: {
              name: true,
              permissions: {
                select: {
                  permission: {
                    select: { name: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!admin || admin.status !== "ACTIVE") {
    throw accountUnavailableError();
  }

  const canManageClaims = admin.roles.some(
    ({ role }) =>
      role.name === "SUPER_ADMIN" ||
      role.permissions.some(({ permission }) => permission.name === "business_claims.manage")
  );

  if (!canManageClaims) {
    throw new AppError({
      code: "permission_denied",
      message: "You do not have permission to manage business claims.",
      statusCode: 403,
      title: "Permission denied"
    });
  }

  return admin.id;
}
