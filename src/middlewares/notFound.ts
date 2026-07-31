import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../utils/errors/app.error";

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  next(
    new AppError(httpStatus.NOT_FOUND, `Route ${req.originalUrl} not found`, {
      path: req.originalUrl,
      method: req.method,
      description: "The requested route does not exist on the server. This could be due to a typo in the URL or an incorrect HTTP method. Please check the route and try again.",
    }),
  );
};
