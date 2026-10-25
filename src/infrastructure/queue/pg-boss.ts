import { PgBoss } from "pg-boss";
import type { Logger } from "pino";

export function createJobQueue(options: { databaseUrl: string; logger: Logger }): PgBoss {
  const jobQueue = new PgBoss({
    connectionString: options.databaseUrl,
    persistWarnings: true,
    schema: "pgboss"
  });

  jobQueue.on("error", (error) => {
    options.logger.error({ err: error }, "Background job queue error");
  });

  jobQueue.on("warning", (warning) => {
    options.logger.warn({ warning }, "Background job queue warning");
  });

  return jobQueue;
}
