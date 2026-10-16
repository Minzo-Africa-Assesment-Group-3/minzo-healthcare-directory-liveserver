import { createApp } from "./app.js";
import { createApplicationDependencies } from "./bootstrap/index.js";
import { loadEnvironment } from "./config/env.js";
import {
    bootstrapLogger,
    createLogger,
} from "./infrastructure/logging/index.js";

async function startServer(): Promise<void> {
    const env = loadEnvironment();

    const logger = createLogger({
        environment: env.NODE_ENV,
        level: env.LOG_LEVEL,
    });

    const dependencies = createApplicationDependencies(env);

    await dependencies.database.$connect();
    logger.info("Database connection established");

    const app = createApp({
        apiRateLimiter: dependencies.apiRateLimiter,
        corsMiddleware: dependencies.corsMiddleware,
        logger,
        routes: dependencies.routes,
        trustProxyHops: dependencies.trustProxyHops,
    });

    const server = app.listen(
        env.PORT,
        env.HOST,
        () => {
            logger.info(
                {
                    host: env.HOST,
                    port: env.PORT,
                },
                "HTTP server listening",
            );
        },
    );

    server.once("error", (error) => {
        logger.fatal(
            { err: error },
            "HTTP server encountered a fatal error",
        );

        void dependencies.database.$disconnect().finally(() => {
            process.exitCode = 1;
        });
    });

    let isShuttingDown = false;

    async function shutdown(
        signal: NodeJS.Signals,
    ): Promise<void> {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;
        logger.info({ signal }, "Graceful shutdown started");

        const forceShutdownTimer = setTimeout(() => {
            logger.fatal(
                { timeoutMs: env.SHUTDOWN_TIMEOUT_MS },
                "Graceful shutdown timed out",
            );
            process.exit(1);
        }, env.SHUTDOWN_TIMEOUT_MS);

        forceShutdownTimer.unref();

        try {
            await new Promise<void>((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });

            await dependencies.database.$disconnect();
            logger.info("Graceful shutdown completed");
        } catch (error) {
            logger.error(
                { err: error },
                "Graceful shutdown failed",
            );
            process.exitCode = 1;
        } finally {
            clearTimeout(forceShutdownTimer);
        }
    }

    process.once("SIGINT", () => {
        void shutdown("SIGINT");
    });

    process.once("SIGTERM", () => {
        void shutdown("SIGTERM");
    });
}

void startServer().catch((error: unknown) => {
    bootstrapLogger.fatal(
        { err: error },
        "Application failed during startup",
    );

    process.exitCode = 1;
});
