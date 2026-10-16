import { initContract } from "@ts-rest/core";

import { getHealthContract } from "./queries/get-health/get-health.contract.js";
import { getHealthHandler } from "./queries/get-health/get-health.handler.js";

const contract = initContract();

export const systemContract = contract.router({
  getHealth: getHealthContract,
});

export const systemHandlers = {
  getHealth: getHealthHandler,
};
