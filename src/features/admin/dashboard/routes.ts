import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import type { AuthenticationMiddlewares } from "../../../shared/authentication/authentication.middleware.js";
import { getAdminDashboardOverviewContract } from "./queries/get-admin-dashboard-overview/get-admin-dashboard-overview.contract.js";
import { createGetAdminDashboardOverviewHandler } from "./queries/get-admin-dashboard-overview/get-admin-dashboard-overview.handler.js";

const contract = initContract();

export const adminDashboardContract = contract.router({
  overview: getAdminDashboardOverviewContract
});

export interface AdminDashboardRouteDependencies {
  database: DatabaseClient;
}

export function createAdminDashboardHandlers(
  dependencies: AdminDashboardRouteDependencies,
  { admin: authenticateAdmin }: AuthenticationMiddlewares
) {
  return {
    overview: {
      middleware: [authenticateAdmin],
      handler: createGetAdminDashboardOverviewHandler(dependencies)
    }
  };
}
