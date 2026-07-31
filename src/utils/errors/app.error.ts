class AppError extends Error {
  statusCode: number;
  errorInfo?: Record<string, unknown>;

  constructor(
    statusCode: number,
    message: string,
    errorInfo?: Record<string, unknown>,
    stack = "",
  ) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    this.errorInfo = errorInfo;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
