import "dotenv/config";

process.env.PORT = process.env.JOB_DASHBOARD_PORT ?? "3010";

await import("@pg-boss/dashboard/build/server.js");
