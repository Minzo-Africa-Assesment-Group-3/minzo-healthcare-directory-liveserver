export interface AppErrorOptions {
  cause?: unknown;
  code: string;
  extensions?: Readonly<Record<string, unknown>>;
  message: string;
  statusCode: number;
  title?: string;
  type?: string;
}

export class AppError extends Error {
  readonly code: string;
  readonly extensions: Readonly<Record<string, unknown>> | undefined;
  readonly statusCode: number;
  readonly title: string | undefined;
  readonly type: string | undefined;

  constructor(options: AppErrorOptions) {
    super(options.message, {
      cause: options.cause
    });

    this.name = "AppError";
    this.code = options.code;
    this.extensions = options.extensions;
    this.statusCode = options.statusCode;
    this.title = options.title;
    this.type = options.type;

    Error.captureStackTrace(this, AppError);
  }
}
