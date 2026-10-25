import { initContract } from "@ts-rest/core";
import { z } from "zod";

import { problemDetailsSchema } from "../../../../../shared/errors/problem-details.schema.js";

export const assistantMessageSchema = z
  .object({
    message: z.string().trim().min(1).max(5_000),
    conversation_id: z.string().trim().min(1).max(128).optional(),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().trim().min(1).max(5_000)
          })
          .strict()
      )
      .max(20)
      .default([]),
    business_context: z
      .object({
        business_id: z.string().uuid().optional(),
        business_slug: z.string().trim().min(1).max(200).optional()
      })
      .strict()
      .optional()
  })
  .strict();

export const assistantMessageResponseSchema = z.object({
  conversation_id: z.string(),
  answer: z.string(),
  proposed_action: z.null()
});

export type AssistantMessage = z.infer<typeof assistantMessageSchema>;
export type AssistantMessageResponse = z.infer<typeof assistantMessageResponseSchema>;

export const sendAssistantMessageContract = initContract().mutation({
  method: "POST",
  path: "/api/v1/assistant/messages",
  body: assistantMessageSchema,
  strictStatusCodes: true,
  summary: "Ask the assistant",
  description:
    "Anonymous callers can ask public questions. A valid user bearer token enables read-only access to their profile and reviews. Do not send user IDs, credentials or principal objects in the body.",
  responses: {
    200: assistantMessageResponseSchema,
    401: problemDetailsSchema,
    403: problemDetailsSchema,
    502: problemDetailsSchema,
    503: problemDetailsSchema,
    504: problemDetailsSchema
  },
  metadata: { authentication: "optional-user-access-token", openApiTags: ["Assistant"] }
});
