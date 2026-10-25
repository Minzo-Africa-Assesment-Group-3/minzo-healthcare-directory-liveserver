import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../infrastructure/database/index.js";
import type { AuthenticationMiddlewares } from "../../shared/authentication/authentication.middleware.js";
import { moderateCustomerFeedbackContract } from "./commands/moderate-customer-feedback/moderate-customer-feedback.contract.js";
import { createModerateCustomerFeedbackHandler } from "./commands/moderate-customer-feedback/moderate-customer-feedback.handler.js";
import { moderateCustomerFeedbackAutomationContract } from "./commands/moderate-customer-feedback-automation/moderate-customer-feedback-automation.contract.js";
import { createModerateCustomerFeedbackAutomationHandler } from "./commands/moderate-customer-feedback-automation/moderate-customer-feedback-automation.handler.js";
import { listCustomerFeedbackForModerationContract } from "./queries/list-customer-feedback/list-customer-feedback.contract.js";
import { createListCustomerFeedbackForModerationHandler } from "./queries/list-customer-feedback/list-customer-feedback.handler.js";
import { createServiceKeyMiddleware } from "../../shared/authentication/index.js";

const contract = initContract();

export const customerFeedbackModerationContract = contract.router({
  list: listCustomerFeedbackForModerationContract,
  moderate: moderateCustomerFeedbackContract,
  moderateWithAutomation: moderateCustomerFeedbackAutomationContract
});

export interface CustomerFeedbackModerationRouteDependencies {
  automationActorReference: string;
  automationServiceKey: string;
  database: DatabaseClient;
}

export function createCustomerFeedbackModerationHandlers(
  dependencies: CustomerFeedbackModerationRouteDependencies,
  { admin: authenticateAdmin }: AuthenticationMiddlewares
) {
  const authenticateAutomation = createServiceKeyMiddleware(dependencies.automationServiceKey);

  return {
    list: {
      middleware: [authenticateAdmin],
      handler: createListCustomerFeedbackForModerationHandler(dependencies)
    },
    moderate: {
      middleware: [authenticateAdmin],
      handler: createModerateCustomerFeedbackHandler(dependencies)
    },
    moderateWithAutomation: {
      middleware: [authenticateAutomation],
      handler: createModerateCustomerFeedbackAutomationHandler({
        actorReference: dependencies.automationActorReference,
        database: dependencies.database
      })
    }
  };
}
