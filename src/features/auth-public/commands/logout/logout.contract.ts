import { initContract } from "@ts-rest/core";

const contract = initContract();

export const logoutContract = contract.mutation({
  method: "POST",
  path: "/api/v1/auth/logout",
  strictStatusCodes: true,
  summary: "Log out the current session",
  description: "Revokes the current refresh-token family and clears its cookie.",
  body: contract.noBody(),
  responses: {
    204: contract.noBody()
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Authentication"]
  }
});
