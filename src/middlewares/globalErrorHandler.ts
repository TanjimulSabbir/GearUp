// src/middlewares/globalErrorHandler.ts
import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import config from "../config/index";
import { TGenericErrorResponse } from "../../types/app.error.response";
import AppError from "../utils/errors/app.error";
import {
  handlePrismaInitError,
  handlePrismaKnownError,
  handlePrismaValidationError,
} from "../utils/errors/handle.prisma.error";
import { Prisma } from "../../generated/prisma/client";
import { ZodError } from "zod";
import { handleZodError } from "../utils/errors/zod.error";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode: number = Number(httpStatus.INTERNAL_SERVER_ERROR || 500);
  let message = err.message || "Internal Server Error";
  let errorName = err.name || "Error";
  let errorInfo: Record<string, unknown> = {};

  const applyResult = (result: TGenericErrorResponse) => {
    statusCode = Number(result.statusCode);
    message = result.message;
    errorName = result.errorName;
    errorInfo = result.errorInfo;
  };

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorName = err.name;
    errorInfo = err.errorInfo || {};
  } else if (err instanceof ZodError) {
    applyResult(handleZodError(err as ZodError));
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    applyResult(handlePrismaValidationError());
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    applyResult(handlePrismaKnownError(err));
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    applyResult(handlePrismaInitError(err));
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = "Error occurred during query execution";
    errorName = "PrismaClientUnknownRequestError";
  }

  if (
    config.node_env === "development" &&
    Object.keys(errorInfo).length === 0
  ) {
    errorInfo = { stack: err.stack };
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    name: errorName,
    message,
    errorInfo,
  });
};
