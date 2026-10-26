import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { recordAuditLog } from "../../../audit-logs/record-audit-log.js";
import { requireDirectoryManager } from "../../directory-management.authorization.js";
import { createDirectorySlug, normalizeDirectoryName } from "../../directory-slug.js";
import type { createCityContract } from "./create-city.contract.js";

export function createCreateCityHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof createCityContract> {
  return async ({ body, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireDirectoryManager({ adminUserId, database: dependencies.database });
    const name = normalizeDirectoryName(body.name);

    try {
      const city = await dependencies.database.$transaction(async (transaction) => {
        const county = await transaction.county.findUnique({
          where: { id: body.countyId },
          select: { id: true, isActive: true }
        });

        if (!county) {
          throw new AppError({
            code: "county_not_found",
            message: "The selected county does not exist.",
            statusCode: 404,
            title: "County not found"
          });
        }

        if (!county.isActive) {
          throw new AppError({
            code: "county_inactive",
            message: "A city or town cannot be added to an inactive county.",
            statusCode: 409,
            title: "County inactive"
          });
        }

        const createdCity = await transaction.city.create({
          data: {
            countyId: county.id,
            name,
            slug: createDirectorySlug(name)
          },
          select: { id: true, countyId: true, name: true, slug: true, isActive: true }
        });

        await recordAuditLog(transaction, {
          actor: { type: "ADMIN", adminUserId },
          action: "directory.city.created",
          entity: { id: createdCity.id, type: "CITY" },
          metadata: { countyId: createdCity.countyId, name: createdCity.name }
        });

        return createdCity;
      });

      return { status: 201, body: city };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError({
          code: "city_already_exists",
          message: "A city or town with this name already exists in the selected county.",
          statusCode: 409,
          title: "City or town already exists"
        });
      }

      throw error;
    }
  };
}
