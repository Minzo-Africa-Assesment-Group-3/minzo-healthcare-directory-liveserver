import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { DatabaseClient } from "../../../../infrastructure/database/index.js";
import { requireAuthenticatedPrincipal } from "../../../../shared/authentication/route-authentication.js";
import type { updateLocationServicesContract } from "./update-location-services.contract.js";
import { updateLocationServices } from "./update-location-services.use-case.js";

export function createUpdateLocationServicesHandler(dependencies: {
  database: DatabaseClient;
}): AppRouteMutationImplementation<typeof updateLocationServicesContract> {
  return async ({ body, params, req }) => {
    const userId = requireAuthenticatedPrincipal(req, "user").subjectId;

    const result = await updateLocationServices(dependencies.database, {
      businessId: params.businessId,
      locationId: params.locationId,
      serviceNames: body.services,
      userId,
    });

    return {
      status: 200,
      body: result,
    };
  };
}
