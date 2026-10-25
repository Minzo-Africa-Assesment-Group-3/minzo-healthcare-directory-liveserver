import { randomUUID } from "node:crypto";

import { Prisma } from "../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { AppError } from "../../../../shared/errors/app-error.js";
import { normalizeBusinessServices } from "../../business-service.js";

interface UpdateLocationServicesCommand {
  businessId: string;
  locationId: string;
  serviceNames: readonly string[];
  userId: string;
}

function locationNotFoundError(): AppError {
  return new AppError({
    code: "business_location_not_found",
    message: "The requested business location does not exist.",
    statusCode: 404,
    title: "Business location not found"
  });
}

function permissionDeniedError(): AppError {
  return new AppError({
    code: "permission_denied",
    message: "You are not allowed to manage this business location.",
    statusCode: 403,
    title: "Permission denied"
  });
}

export async function updateLocationServices(
  database: DatabaseClient,
  command: UpdateLocationServicesCommand
) {
  const serviceInputs = normalizeBusinessServices(command.serviceNames);

  try {
    return await database.$transaction(
      async (transaction) => {
        const location = await transaction.businessLocation.findUnique({
          where: {
            id: command.locationId,
            businessId: command.businessId
          },
          select: {
            id: true,
            business: {
              select: {
                status: true,
                memberships: {
                  where: { userId: command.userId },
                  select: { role: true },
                  take: 1
                }
              }
            }
          }
        });

        if (!location) {
          throw locationNotFoundError();
        }

        if (location.business.memberships.length === 0) {
          throw permissionDeniedError();
        }

        if (location.business.status === "SUSPENDED") {
          throw new AppError({
            code: "business_suspended",
            message: "A suspended business cannot update its services.",
            statusCode: 403,
            title: "Business suspended"
          });
        }

        const services = [];

        for (const serviceInput of serviceInputs) {
          const service = await transaction.service.upsert({
            where: { slug: serviceInput.slug },
            update: {},
            create: {
              id: randomUUID(),
              name: serviceInput.name,
              slug: serviceInput.slug
            },
            select: {
              id: true,
              name: true,
              slug: true
            }
          });

          services.push(service);
        }

        await transaction.businessLocationService.deleteMany({
          where: { businessLocationId: location.id }
        });

        if (services.length > 0) {
          await transaction.businessLocationService.createMany({
            data: services.map((service) => ({
              businessLocationId: location.id,
              serviceId: service.id
            }))
          });
        }

        return {
          businessId: command.businessId,
          locationId: location.id,
          services: services.sort((left, right) => left.name.localeCompare(right.name))
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      throw new AppError({
        code: "business_services_update_conflict",
        message: "The service list changed during this request. Please try again.",
        statusCode: 409,
        title: "Business services update conflict"
      });
    }

    throw error;
  }
}
