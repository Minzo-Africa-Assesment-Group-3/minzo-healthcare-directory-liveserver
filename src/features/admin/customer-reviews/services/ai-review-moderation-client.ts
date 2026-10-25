import { z } from "zod";

const aiModerationResponseSchema = z.object({
  callbackStatus: z.literal("RECORDED"),
  reviewId: z.string().uuid()
});

export interface AiReviewModerationClient {
  evaluateCustomerReview(input: {
    business: { id: string; name: string };
    reviewId: string;
    reviewUpdatedAt: string;
    stars: number;
    text: string;
  }): Promise<"RECORDED" | "STALE">;
}

export function createAiReviewModerationClient(options: {
  baseUrl: string;
  serviceKey: string;
  timeoutMs: number;
  fetch?: typeof globalThis.fetch;
}): AiReviewModerationClient {
  const request = options.fetch ?? globalThis.fetch;

  return {
    async evaluateCustomerReview(input) {
      const signal = AbortSignal.timeout(options.timeoutMs);

      try {
        const response = await request(new URL("/v1/moderation/customer-reviews/evaluate", options.baseUrl), {
          method: "POST",
          redirect: "error",
          signal,
          headers: {
            "Content-Type": "application/json",
            "X-Service-Key": options.serviceKey
          },
          body: JSON.stringify(input)
        });

        if (response.status === 404 || response.status === 409) {
          return "STALE";
        }

        if (!response.ok) {
          throw new Error(`AI moderation request failed with HTTP ${response.status}.`);
        }

        const result = aiModerationResponseSchema.parse(await response.json());

        if (result.reviewId !== input.reviewId) {
          throw new Error("AI moderation response referenced another review.");
        }

        return result.callbackStatus;
      } catch (error) {
        if (signal.aborted) {
          throw new Error("AI moderation request timed out.", { cause: error });
        }

        throw error;
      }
    }
  };
}
