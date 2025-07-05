import type { Response } from "express";
import { HTTP_STATUS } from "@/common/constants/httpStatus";
import {
  ApiErrorDetail,
  ApiErrorResponse,
  HttpErrorStatus,
} from "@/common/types/api";
import ApiResponse from "./ApiResponse";

export default class ApiError extends Error {
  public readonly response: ApiResponse;
  public readonly errors: ApiErrorDetail[];

  constructor(
    errors: ApiErrorDetail[] | string,
    status: HttpErrorStatus = "INTERNAL_SERVER_ERROR"
  ) {
    const errorDetails = Array.isArray(errors) ? errors : [{ message: errors }];
    super(errorDetails[0].message);

    const statusCode = HTTP_STATUS.ERROR[status];
    const statusMessage = status.replace(/_/g, " ");

    this.response = new ApiResponse(
      statusCode,
      statusMessage,
      errorDetails[0].message
    );
    this.errors = errorDetails;

    Error.captureStackTrace(this, this.constructor);
  }

  public send(res: Response): void {
    const response: ApiErrorResponse = {
      ...this.response,
      errors: this.errors,
      ...(process.env.NODE_ENV === "development" && { stack: this.stack }),
    };

    res.status(this.response.statusCode).json(response);
  }

  public static fromError(error: Error): ApiError {
    return new ApiError(error.message);
  }
}
