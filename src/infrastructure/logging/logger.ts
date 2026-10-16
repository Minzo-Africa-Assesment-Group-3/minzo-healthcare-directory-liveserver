import { hostname } from 'node:os'
import pino, { type LevelWithSilent, type Logger, type LoggerOptions } from "pino";

export interface LoggerConfig {
    environment: string;
    level: LevelWithSilent;
}

function createLoggerOptions(
    config: LoggerConfig,
): LoggerOptions {
    return {
        level: config.level,
        timestamp: pino.stdTimeFunctions.isoTime,
        base: {
            service: "minzo-express-boiler",
            environment: config.environment,
            hostname: hostname(),
            pid: process.pid,
        },
        ...(config.environment === "development"
            ? {
                transport: {
                    target: "pino-pretty",
                    options: {
                        colorize: true,
                        translateTime: "SYS:standard",
                        ignore:
                            "pid,hostname,service,environment",
                    },
                },
            }
            : {}),

        redact: {
            paths: [
                "password",
                "token",
                "accessToken",
                "refreshToken",
                "authorization",
                "cookie",
                "DATABASE_URL",
                "req.headers.authorization",
                "req.headers.cookie",
                "res.headers['set-cookie']",
            ],
            censor: "[REDACTED]",
        },
    };
}

export const bootstrapLogger: Logger = pino(
    createLoggerOptions({
        environment: "bootstrap",
        level: "info",
    }),
);

export function createLogger(
    config: LoggerConfig,
): Logger {
    return pino(createLoggerOptions(config));
}