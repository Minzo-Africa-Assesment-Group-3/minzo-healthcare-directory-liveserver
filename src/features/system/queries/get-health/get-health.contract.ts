import { initContract } from "@ts-rest/core";
import { z } from "zod";

const contract = initContract();

export const getHealthContract = contract.query({
  method: "GET",
  path: "/api/v1/health",
  strictStatusCodes: true,
  summary: "Check application health",
  description: "Confirms that the HTTP application is running and able to handle requests.",
  responses: {
    200: z.object({
      status: z.literal("ok")
    })
  },
  metadata: {
    authentication: "public",
    openApiTags: ["System"]
  }
});
