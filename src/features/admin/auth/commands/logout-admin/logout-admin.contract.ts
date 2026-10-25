import { initContract } from "@ts-rest/core";

const contract = initContract();

export const logoutAdminContract = contract.mutation({
  method: "POST",
  path: "/api/v1/admin/auth/logout",
  strictStatusCodes: true,
  summary: "Log out an administrator session",
  description: "Revokes the current administrator refresh-token family and clears its cookie.",
  body: contract.noBody(),
  responses: {
    204: contract.noBody()
  },
  metadata: {
    authentication: "public",
    openApiTags: ["Admin Authentication"]
  }
});
