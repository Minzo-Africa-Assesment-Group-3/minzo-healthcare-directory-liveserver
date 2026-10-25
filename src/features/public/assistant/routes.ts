import { initContract } from "@ts-rest/core";

import type { AuthenticationMiddlewares } from "../../../shared/authentication/authentication.middleware.js";
import { sendAssistantMessageContract } from "./commands/send-assistant-message/send-assistant-message.contract.js";
import { createSendAssistantMessageHandler } from "./commands/send-assistant-message/send-assistant-message.handler.js";
import type { AssistantClient } from "./services/assistant-client.js";

export interface AssistantRouteDependencies {
  assistantClient: AssistantClient;
}
export const assistantContract = initContract().router({ messages: sendAssistantMessageContract });

export function createAssistantHandlers(
  dependencies: AssistantRouteDependencies,
  authentication: AuthenticationMiddlewares
) {
  return {
    messages: {
      middleware: [authentication.optionalUser],
      handler: createSendAssistantMessageHandler(dependencies)
    }
  };
}
