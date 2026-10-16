import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../infrastructure/database/index.js";
import type { AuthenticationMiddlewares } from "../../shared/authentication/authentication.middleware.js";
import { moderateCustomerFeedbackContract } from "./commands/moderate-customer-feedback/moderate-customer-feedback.contract.js";
import { createModerateCustomerFeedbackHandler } from "./commands/moderate-customer-feedback/moderate-customer-feedback.handler.js";
import { listCustomerFeedbackForModerationContract } from "./queries/list-customer-feedback/list-customer-feedback.contract.js";
import { createListCustomerFeedbackForModerationHandler } from "./queries/list-customer-feedback/list-customer-feedback.handler.js";

const contract = initContract();

export const customerFeedbackModerationContract = contract.router({
  list: listCustomerFeedbackForModerationContract,
  moderate: moderateCustomerFeedbackContract,
});

export interface CustomerFeedbackModerationRouteDependencies {
  database: DatabaseClient;
}

export function createCustomerFeedbackModerationHandlers(
  dependencies: CustomerFeedbackModerationRouteDependencies,
  { admin: authenticateAdmin }: AuthenticationMiddlewares,
) {
  return {
    list: {
      middleware: [authenticateAdmin],
      handler: createListCustomerFeedbackForModerationHandler(dependencies),
    },
    moderate: {
      middleware: [authenticateAdmin],
      handler: createModerateCustomerFeedbackHandler(dependencies),
    },
  };
}
