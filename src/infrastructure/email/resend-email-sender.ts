import { Resend } from "resend";

import type { EmailSender, SendEmailInput } from "./email-sender.js";

export interface ResendEmailSenderOptions {
  apiKey: string;
  from: string;
}

export function createResendEmailSender({ apiKey, from }: ResendEmailSenderOptions): EmailSender {
  const resend = new Resend(apiKey);

  return Object.freeze({
    async send(input: SendEmailInput): Promise<void> {
      const { error } = await resend.emails.send(
        {
          from,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text
        },
        {
          idempotencyKey: input.idempotencyKey
        }
      );

      if (error) {
        throw new Error("The email provider rejected the message.", {
          cause: error
        });
      }
    }
  });
}
