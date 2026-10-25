import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import type { AuthenticationMiddlewares } from "../../../shared/authentication/authentication.middleware.js";
import { listAuditLogsContract } from "./queries/list-audit-logs/list-audit-logs.contract.js";
import { createListAuditLogsHandler } from "./queries/list-audit-logs/list-audit-logs.handler.js";

const contract = initContract();

export const auditLogsContract = contract.router({
  list: listAuditLogsContract
});

export interface AuditLogsRouteDependencies {
  database: DatabaseClient;
}

export function createAuditLogsHandlers(
  dependencies: AuditLogsRouteDependencies,
  { admin: authenticateAdmin }: AuthenticationMiddlewares
) {
  return {
    list: {
      middleware: [authenticateAdmin],
      handler: createListAuditLogsHandler(dependencies)
    }
  };
}
