import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import AppError from "./app.error";

import httpStatus from "http-status";
import { ZodError } from "zod";
import { TGenericErrorResponse } from "../../../types/app.error.response";

export const validate =
  (schema: z.ZodTypeAny, target: "body" | "query" = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const data = target === "body" ? req.body : req.query;

    const result = schema.safeParse(data);

    if (!result.success) {
      return next(
        new AppError(400, "Validation Error", {
          issues: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          })),
        }),
      );
    }

    next();
  };

export const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const issues = err.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: "Validation error",
    errorName: "ZodValidationError",
    errorInfo: { issues },
  };
};
