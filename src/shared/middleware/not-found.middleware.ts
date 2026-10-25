import type { RequestHandler } from "express";

import { AppError } from "../errors/app-error.js";

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(
    new AppError({
      code: "route_not_found",
      message: "The requested route was not found",
      statusCode: 404
    })
  );
};
