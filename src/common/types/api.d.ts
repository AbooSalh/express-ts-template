import { HTTP_STATUS } from "../constants/httpStatus";

export type HttpSuccessStatus = keyof typeof HTTP_STATUS.SUCCESS;
export type HttpErrorStatus = keyof typeof HTTP_STATUS.ERROR;
export type ApiStatus = "success" | "fail" | "error";

export interface ApiErrorDetail {
  message: string;
  field?: string;
  value?: string;
  code?: string;
}

export interface ApiResponseBase {
  statusCode: number;
  statusMessage: string;
  status: ApiStatus;
  message: string;
  timestamp: string;
}

export interface ApiErrorResponse extends ApiResponseBase {
  errors: ApiErrorDetail[];
  stack?: string;
}

export interface ApiSuccessResponse<T = unknown> extends ApiResponseBase {
  data: T;
}
