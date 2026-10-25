import { STATUS_CODES } from "node:http";

import type { Response } from "express";

interface ProblemDetailsRequest {
  id?: unknown;
  originalUrl: string;
}

export interface ProblemDetails {
  [extension: string]: unknown;
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  requestId?: string;
}

export interface ProblemDetailsOptions {
  code?: string | undefined;
  detail?: string | undefined;
  extensions?: Readonly<Record<string, unknown>> | undefined;
  statusCode: number;
  title?: string | undefined;
  type?: string | undefined;
}

const reservedMembers = new Set(["type", "title", "status", "detail", "instance", "code", "requestId"]);

function getRequestPath(request: ProblemDetailsRequest): string {
  const [path] = request.originalUrl.split("?");

  return path || "/";
}

function getRequestId(request: ProblemDetailsRequest): string | undefined {
  if (typeof request.id === "string") {
    return request.id;
  }

  if (typeof request.id === "number") {
    return String(request.id);
  }

  return undefined;
}

function getSafeExtensions(
  extensions: Readonly<Record<string, unknown>> | undefined
): Record<string, unknown> {
  if (!extensions) {
    return {};
  }

  return Object.fromEntries(Object.entries(extensions).filter(([name]) => !reservedMembers.has(name)));
}

export function createProblemDetails(
  request: ProblemDetailsRequest,
  options: ProblemDetailsOptions
): ProblemDetails {
  const problem: ProblemDetails = {
    ...getSafeExtensions(options.extensions),
    type: options.type ?? "about:blank",
    title: options.title ?? STATUS_CODES[options.statusCode] ?? "HTTP Error",
    status: options.statusCode,
    instance: getRequestPath(request)
  };

  if (options.detail !== undefined) {
    problem.detail = options.detail;
  }

  if (options.code !== undefined) {
    problem.code = options.code;
  }

  const requestId = getRequestId(request);

  if (requestId !== undefined) {
    problem.requestId = requestId;
  }

  return problem;
}

export function sendProblemDetails(
  request: ProblemDetailsRequest,
  response: Response,
  options: ProblemDetailsOptions
): void {
  const problem = createProblemDetails(request, options);

  response.status(problem.status).type("application/problem+json").json(problem);
}
