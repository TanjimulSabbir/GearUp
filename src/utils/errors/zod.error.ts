import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import AppError from "./app.error";

import httpStatus from "http-status";
import { ZodError } from "zod";
import { TGenericErrorResponse } from "../../../types/app.error.response";
import { ParamsDictionary } from "express-serve-static-core";

export const validate =
  (schema: z.ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return next(
        new AppError(httpStatus.BAD_REQUEST, "Data Validation Error", {
          issues: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          })),
        }),
      );
    }

    const parsed = result.data as {
      body?: unknown;
      params?: unknown;
      query?: unknown;
    };

    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.params !== undefined)
      req.params = parsed.params as ParamsDictionary;
    if (parsed.query !== undefined)
      req.query = parsed.query as Request["query"];

    next();
  };

export const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const issues = err.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: " Data Validation Error",
    errorName: "ZodValidationError",
    errorInfo: { issues },
  };
};
