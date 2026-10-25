import { initContract } from "@ts-rest/core";

import type { DatabaseClient } from "../../../infrastructure/database/index.js";
import type { ObjectStorage } from "../../../infrastructure/storage/index.js";
import type { AuthenticationMiddlewares } from "../../../shared/authentication/authentication.middleware.js";
import { reviewBusinessRegistrationContract } from "./commands/review-business-registration/review-business-registration.contract.js";
import { createReviewBusinessRegistrationHandler } from "./commands/review-business-registration/review-business-registration.handler.js";
import { getBusinessRegistrationContract } from "./queries/get-business-registration/get-business-registration.contract.js";
import { createGetBusinessRegistrationHandler } from "./queries/get-business-registration/get-business-registration.handler.js";
import { listBusinessRegistrationsContract } from "./queries/list-business-registrations/list-business-registrations.contract.js";
import { createListBusinessRegistrationsHandler } from "./queries/list-business-registrations/list-business-registrations.handler.js";

const contract = initContract();

export const businessModerationContract = contract.router({
  listRegistrations: listBusinessRegistrationsContract,
  getRegistration: getBusinessRegistrationContract,
  moderateRegistration: reviewBusinessRegistrationContract
});

export interface BusinessModerationRouteDependencies {
  database: DatabaseClient;
  objectStorage: ObjectStorage;
}

export function createBusinessModerationHandlers(
  dependencies: BusinessModerationRouteDependencies,
  { admin: authenticateAdmin }: AuthenticationMiddlewares
) {
  return {
    listRegistrations: {
      middleware: [authenticateAdmin],
      handler: createListBusinessRegistrationsHandler(dependencies)
    },
    getRegistration: {
      middleware: [authenticateAdmin],
      handler: createGetBusinessRegistrationHandler(dependencies)
    },
    moderateRegistration: {
      middleware: [authenticateAdmin],
      handler: createReviewBusinessRegistrationHandler(dependencies)
    }
  };
}
