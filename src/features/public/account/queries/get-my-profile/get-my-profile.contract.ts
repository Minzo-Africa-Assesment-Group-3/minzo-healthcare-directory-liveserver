import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { userAccountSummarySchema } from "../../../../../shared/account/user-account-summary.js";
export const getMyProfileContract = initContract().query({
  method: "GET",
  path: "/api/v1/me",
  query: z.object({}).strict(),
  strictStatusCodes: true,
  summary: "Get my profile",
  description: "Returns the signed-in user's profile.",
  responses: {
    200: userAccountSummarySchema
  },
  metadata: {
    authentication: "user-access-token",
    openApiTags: ["My Account"]
  }
});
