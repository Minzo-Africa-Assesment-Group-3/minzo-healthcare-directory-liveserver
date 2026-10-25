import type { AppRouteMutationImplementation } from "@ts-rest/express";

import type { AssistantClient } from "../../services/assistant-client.js";
import type { sendAssistantMessageContract } from "./send-assistant-message.contract.js";

export function createSendAssistantMessageHandler({
  assistantClient
}: {
  assistantClient: AssistantClient;
}): AppRouteMutationImplementation<typeof sendAssistantMessageContract> {
  return async ({ body, req, res }) => {
    res.setHeader("Cache-Control", "no-store");
    // optionalUser has verified any supplied token before this handler executes.
    const result = await assistantClient.sendMessage(body, req.headers.authorization);
    return { status: 200, body: result };
  };
}
