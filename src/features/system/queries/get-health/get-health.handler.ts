import type { AppRouteQueryImplementation } from "@ts-rest/express";

import type { getHealthContract } from "./get-health.contract.js";

export const getHealthHandler: AppRouteQueryImplementation<typeof getHealthContract> = async ({ res }) => {
  res.setHeader("Cache-Control", "no-store");

  return {
    status: 200,
    body: {
      status: "ok"
    }
  };
};
