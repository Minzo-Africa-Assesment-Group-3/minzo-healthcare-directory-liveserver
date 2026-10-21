import type { DatabaseClient } from "../../infrastructure/database/index.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function requireBusinessFeedbackViewer(options: {
  businessId: string;
  database: DatabaseClient;
  userId: string;
}): Promise<void> {
  const membership = await options.database.businessMembership.findUnique({
    where: {
      userId_businessId: {
        businessId: options.businessId,
        userId: options.userId,
      },
    },
    select: { role: true },
  });

  if (
    !membership ||
    (membership.role !== "OWNER" && membership.role !== "MANAGER")
  ) {
    throw new AppError({
      code: "permission_denied",
      message: "You are not allowed to view this business's review dashboard.",
      statusCode: 403,
      title: "Permission denied",
    });
  }
}
