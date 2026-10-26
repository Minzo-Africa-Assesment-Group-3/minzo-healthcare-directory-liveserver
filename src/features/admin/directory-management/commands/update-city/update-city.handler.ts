import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { recordAuditLog } from "../../../audit-logs/record-audit-log.js";
import { requireDirectoryManager } from "../../directory-management.authorization.js";
import { createDirectorySlug, normalizeDirectoryName } from "../../directory-slug.js";
import type { updateCityContract } from "./update-city.contract.js";

export function createUpdateCityHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof updateCityContract> {
  return async ({ body, params, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireDirectoryManager({ adminUserId, database: dependencies.database });
    const name = body.name === undefined ? undefined : normalizeDirectoryName(body.name);

    try {
      const city = await dependencies.database.$transaction(async (transaction) => {
        const existingCity = await transaction.city.findUnique({
          where: { id: params.cityId },
          select: { id: true, countyId: true, name: true }
        });

        if (!existingCity) {
          throw new AppError({
            code: "city_not_found",
            message: "The selected city or town does not exist.",
            statusCode: 404,
            title: "City or town not found"
          });
        }

        const countyId = body.countyId ?? existingCity.countyId;

        if (body.countyId !== undefined) {
          const county = await transaction.county.findUnique({
            where: { id: countyId },
            select: { isActive: true }
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
              message: "A city or town cannot be moved to an inactive county.",
              statusCode: 409,
              title: "County inactive"
            });
          }
        }

        const updatedName = name ?? existingCity.name;
        const updatedCity = await transaction.city.update({
          where: { id: existingCity.id },
          data: {
            countyId,
            ...(name === undefined && body.countyId === undefined
              ? {}
              : { slug: createDirectorySlug(updatedName) }),
            ...(name === undefined ? {} : { name: updatedName }),
            ...(body.isActive === undefined ? {} : { isActive: body.isActive })
          },
          select: { id: true, countyId: true, name: true, slug: true, isActive: true }
        });

        await recordAuditLog(transaction, {
          actor: { type: "ADMIN", adminUserId },
          action: "directory.city.updated",
          entity: { id: updatedCity.id, type: "CITY" },
          metadata: {
            countyId: updatedCity.countyId,
            isActive: updatedCity.isActive,
            name: updatedCity.name
          }
        });

        return updatedCity;
      });

      return { status: 200, body: city };
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
