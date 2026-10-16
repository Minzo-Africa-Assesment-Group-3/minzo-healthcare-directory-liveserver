import { randomUUID } from "node:crypto";

import type { Request, Response } from "express";
import type { Logger } from "pino";
import {
    pinoHttp,
    type HttpLogger,
} from "pino-http";

const validRequestIdPattern = /^[a-zA-Z0-9._:-]{1,128}$/;

function getRequestPath(request: Request): string {
    const [path] = request.originalUrl.split("?");

    return path || "/";
}

function getResponseTime(loggableObject: unknown): number | undefined {
    if (
        typeof loggableObject === "object" &&
        loggableObject !== null &&
        "responseTime" in loggableObject &&
        typeof loggableObject.responseTime === "number"
    ) {
        return loggableObject.responseTime;
    }

    return undefined;
}

export function createHttpLogger(
    logger: Logger,
): HttpLogger<Request, Response> {
    return pinoHttp<Request, Response>({
        logger,
        quietReqLogger: true,
        quietResLogger: true,

        customSuccessObject(
            request,
            response,
            loggableObject,
        ) {
            return {
                method: request.method,
                path: getRequestPath(request),
                statusCode: response.statusCode,
                durationMs: getResponseTime(loggableObject),
            };
        },

        customErrorObject(
            request,
            response,
            error,
            loggableObject,
        ) {
            return {
                err: error,
                method: request.method,
                path: getRequestPath(request),
                statusCode: response.statusCode,
                durationMs: getResponseTime(loggableObject),
            };
        },

        genReqId(request, response) {
            const suppliedRequestId = request.get("x-request-id");

            const requestId = suppliedRequestId && validRequestIdPattern.test(suppliedRequestId)
                ? suppliedRequestId
                : randomUUID();

            response.setHeader("x-request-id", requestId);

            return requestId;
        },

        customLogLevel(_request, response, error) {
            if (error || response.statusCode >= 500) {
                return "error";
            }

            if (response.statusCode >= 400) {
                return "warn";
            }

            return "info";
        },

        customSuccessMessage(
            request,
            response,
            responseTime,
        ) {
            return [
                "Finished handling",
                request.method,
                getRequestPath(request),
                "-",
                response.statusCode,
                "-",
                `${responseTime}ms`,
            ].join(" ");
        },

        customErrorMessage(request, response) {
            return [
                "Failed handling",
                request.method,
                getRequestPath(request),
                "-",
                response.statusCode,
            ].join(" ");
        },
    });
}
