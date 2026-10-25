import { z } from "zod";

import { AppError } from "../../../../shared/errors/app-error.js";
import {
  assistantMessageResponseSchema,
  type AssistantMessage,
  type AssistantMessageResponse
} from "../commands/send-assistant-message/send-assistant-message.contract.js";

export interface AssistantClient {
  sendMessage(body: AssistantMessage, authorization?: string): Promise<AssistantMessageResponse>;
}

export function createAssistantClient(options: {
  baseUrl: string;
  serviceKey: string | undefined;
  timeoutMs: number;
  fetch?: typeof globalThis.fetch;
}): AssistantClient {
  const request = options.fetch ?? globalThis.fetch;
  return {
    async sendMessage(body, authorization) {
      if (!options.serviceKey) {
        throw new AppError({
          code: "ai_not_configured",
          message: "The assistant service is not configured.",
          statusCode: 503
        });
      }
      const signal = AbortSignal.timeout(options.timeoutMs);
      try {
        const response = await request(new URL("/v1/assistant/messages", options.baseUrl), {
          method: "POST",
          redirect: "error",
          signal,
          headers: {
            "Content-Type": "application/json",
            "X-Service-Key": options.serviceKey,
            ...(authorization ? { Authorization: authorization } : {})
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            const failure = z
              .object({
                detail: z.object({ code: z.literal("user_authentication_failed") })
              })
              .safeParse(await response.json());
            if (failure.success) {
              throw new AppError({
                code: "authentication_required",
                message: "Please sign in again to access your account information.",
                statusCode: response.status
              });
            }
          }
          throw new AppError({
            code: "ai_request_failed",
            message: "The assistant could not complete this request.",
            statusCode: 502
          });
        }
        return assistantMessageResponseSchema.parse(await response.json());
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError({
          code: signal.aborted ? "ai_request_timeout" : "ai_unavailable",
          message: signal.aborted
            ? "The assistant took too long to respond."
            : "The assistant is temporarily unavailable.",
          statusCode: signal.aborted ? 504 : 502
        });
      }
    }
  };
}
