export type TGenericErrorResponse = {
  statusCode: number | string;
  message: string;
  errorName: string;
  errorInfo: Record<string, unknown>;
};
