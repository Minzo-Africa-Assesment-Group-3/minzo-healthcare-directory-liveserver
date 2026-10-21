import type { DatabaseClient } from "../../infrastructure/database/index.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function requirePublicBusiness(
  database: DatabaseClient,
  businessId: string,
): Promise<void> {
  const business = await database.business.findFirst({
    where: {
      id: businessId,
      status: "APPROVED",
    },
    select: { id: true },
  });

  if (!business) {
    throw new AppError({
      code: "business_not_found",
      message: "The requested business does not exist.",
      statusCode: 404,
      title: "Business not found",
    });
  }
}
