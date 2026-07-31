import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { TGenericErrorResponse } from "../../../types/app.error.response";

export const handlePrismaKnownError = (
  err: Prisma.PrismaClientKnownRequestError,
): TGenericErrorResponse => {
  switch (err.code) {
    case "P2002":
      return {
        statusCode: httpStatus.BAD_REQUEST,
        message: "Duplicate key error",
        errorName: "PrismaDuplicateKeyError",
        errorInfo: { target: err.meta?.target, code: err.code },
      };
    case "P2003":
      return {
        statusCode: httpStatus.BAD_REQUEST,
        message: "Foreign key constraint failed",
        errorName: "PrismaForeignKeyError",
        errorInfo: { field: err.meta?.field_name, code: err.code },
      };
    case "P2025":
      return {
        statusCode: httpStatus.NOT_FOUND,
        message: "The requested record was not found",
        errorName: "PrismaRecordNotFoundError",
        errorInfo: { cause: err.meta?.cause, code: err.code },
      };
    default:
      return {
        statusCode: httpStatus.BAD_REQUEST,
        message: "Database request error",
        errorName: "PrismaKnownRequestError",
        errorInfo: { code: err.code, meta: err.meta },
      };
  }
};

export const handlePrismaValidationError = (): TGenericErrorResponse => ({
  statusCode: httpStatus.BAD_REQUEST,
  message: "You have provided incorrect field type or missing fields",
  errorName: "PrismaClientValidationError",
  errorInfo: {},
});

export const handlePrismaInitError = (
  err: Prisma.PrismaClientInitializationError,
): TGenericErrorResponse => {
  if (err.errorCode === "P1000") {
    return {
      statusCode: httpStatus.UNAUTHORIZED,
      message: "Authentication failed against database server",
      errorName: "PrismaClientInitializationError",
      errorInfo: { errorCode: err.errorCode },
    };
  }
  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: "Can't reach database server",
    errorName: "PrismaClientInitializationError",
    errorInfo: { errorCode: err.errorCode },
  };
};
