import type { ErrorRequestHandler } from "express";

import { AppError } from "../errors/app-error.js";
import { sendProblemDetails } from "../errors/problem-details.js";

interface RequestParsingError extends Error {
  status: number;
  type: string;
}

function isRequestParsingError(error: unknown): error is RequestParsingError {
  return (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number" &&
    "type" in error &&
    typeof error.type === "string"
  );
}

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, next) => {
  if (response.headersSent) {
    next(error);

    return;
  }

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      response.err = error;
    }

    sendProblemDetails(request, response, {
      code: error.code,
      detail: error.message,
      extensions: error.extensions,
      statusCode: error.statusCode,
      title: error.title,
      type: error.type
    });

    return;
  }

  if (isRequestParsingError(error)) {
    if (error.type === "entity.parse.failed") {
      sendProblemDetails(request, response, {
        code: "invalid_json",
        detail: "Request body contains invalid JSON",
        statusCode: 400
      });

      return;
    }

    if (error.type === "entity.too.large") {
      sendProblemDetails(request, response, {
        code: "payload_too_large",
        detail: "Request body exceeds the allowed size",
        statusCode: 413
      });

      return;
    }
  }

  const unexpectedError =
    error instanceof Error
      ? error
      : new Error("A non-Error value was thrown", {
          cause: error
        });

  response.err = unexpectedError;

  sendProblemDetails(request, response, {
    code: "internal_server_error",
    detail: "An unexpected error occurred",
    statusCode: 500
  });
};
