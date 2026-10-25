import type { EmailSender } from "../../../infrastructure/email/index.js";

export interface ReviewRejectionEmailInput {
  businessName: string;
  displayName: string;
  email: string;
  moderationActionId: string;
  moderatedBy: "AI" | "MINZO_ADMIN";
  reason: string;
}

export interface ReviewRejectionEmailService {
  send(input: ReviewRejectionEmailInput): Promise<void>;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return entities[character] ?? character;
  });
}

export function createReviewRejectionEmailService(emailSender: EmailSender): ReviewRejectionEmailService {
  return Object.freeze({
    async send(input: ReviewRejectionEmailInput): Promise<void> {
      const decisionSource =
        input.moderatedBy === "AI" ? "Minzo's automated review system" : "the Minzo review team";
      const safeBusinessName = escapeHtml(input.businessName);
      const safeDisplayName = escapeHtml(input.displayName);
      const safeReason = escapeHtml(input.reason);

      await emailSender.send({
        to: input.email,
        subject: "Your Minzo customer review was removed",
        text: `Hello ${input.displayName},\n\nYour review for ${input.businessName} was removed because it did not meet our review guidelines.\n\nReason: ${input.reason}\n\nThis decision was made by ${decisionSource}. You may update and resubmit your review if appropriate.`,
        html: `<p>Hello ${safeDisplayName},</p><p>Your review for <strong>${safeBusinessName}</strong> was removed because it did not meet our review guidelines.</p><p><strong>Reason:</strong> ${safeReason}</p><p>This decision was made by ${escapeHtml(decisionSource)}. You may update and resubmit your review if appropriate.</p>`,
        idempotencyKey: `customer-review-rejection/${input.moderationActionId}`
      });
    }
  });
}
