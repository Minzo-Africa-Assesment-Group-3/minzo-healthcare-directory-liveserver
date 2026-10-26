import type { AppRouteMutationImplementation } from "@ts-rest/express";

import { Prisma } from "../../../../../generated/prisma/client.js";
import type { DatabaseClient } from "../../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../../shared/authentication/route-authentication.js";
import { AppError } from "../../../../../shared/errors/app-error.js";
import { recordAuditLog } from "../../../audit-logs/record-audit-log.js";
import { requireDirectoryManager } from "../../directory-management.authorization.js";
import { createDirectorySlug, normalizeDirectoryName } from "../../directory-slug.js";
import type { updateCountyContract } from "./update-county.contract.js";

export function createUpdateCountyHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof updateCountyContract> {
  return async ({ body, params, req }) => {
    const adminUserId = requireAuthenticatedPrincipal(req, "admin").subjectId;
    await requireDirectoryManager({ adminUserId, database: dependencies.database });
    const name = body.name === undefined ? undefined : normalizeDirectoryName(body.name);

    try {
      const county = await dependencies.database.$transaction(async (transaction) => {
        const existingCounty = await transaction.county.findUnique({
          where: { id: params.countyId },
          select: { id: true }
        });

        if (!existingCounty) {
          throw new AppError({
            code: "county_not_found",
            message: "The selected county does not exist.",
            statusCode: 404,
            title: "County not found"
          });
        }

        const updatedCounty = await transaction.county.update({
          where: { id: existingCounty.id },
          data: {
            ...(name === undefined ? {} : { name, slug: createDirectorySlug(name) }),
            ...(body.isActive === undefined ? {} : { isActive: body.isActive })
          },
          select: { id: true, name: true, slug: true, isActive: true }
        });

        await recordAuditLog(transaction, {
          actor: { type: "ADMIN", adminUserId },
          action: "directory.county.updated",
          entity: { id: updatedCounty.id, type: "COUNTY" },
          metadata: {
            isActive: updatedCounty.isActive,
            name: updatedCounty.name
          }
        });

        return updatedCounty;
      });

      return { status: 200, body: county };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError({
          code: "county_already_exists",
          message: "A county with this name already exists.",
          statusCode: 409,
          title: "County already exists"
        });
      }

      throw error;
    }
  };
}
