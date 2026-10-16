export interface SendEmailInput {
  html: string;
  idempotencyKey: string;
  subject: string;
  text: string;
  to: string;
}

export interface EmailSender {
  send(input: SendEmailInput): Promise<void>;
}
