import { getRequestListener } from "@hono/node-server";
import { createDashboardHandler } from "@pg-boss/dashboard/handler";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export const jobsDashboardBasePath = "/ops/jobs";

export interface JobsDashboard {
  close(): Promise<void>;
  middleware: RequestHandler;
}

export function createJobsDashboard(options: {
  databaseUrl: string;
}): JobsDashboard {
  const dashboard = createDashboardHandler({
    databases: [{ url: options.databaseUrl, schema: "pgboss" }],
    basePath: jobsDashboardBasePath,
    auth: true
  });
  const listener = getRequestListener(dashboard);

  return Object.freeze({
    close: () => dashboard.close(),
    middleware: (request: Request, response: Response, next: NextFunction) => {
      request.url = request.originalUrl;

      void listener(request, response).catch(next);
    }
  });
}
