import type { NextFunction, Request, Response } from "express";
import { Error as MongooseError } from "mongoose";
import ApiError from "../utils/api/ApiError";
import { ERROR_MAPPINGS } from "../constants/error.constants";
import { ErrorType } from "../types/error";

class ErrorHandler {
  private static getErrorName(err: ErrorType): string {
    if (err instanceof MongooseError) {
      return err.name;
    }
    if (err.name === "MongoError") {
      return "MongoServerError";
    }
    return err.name || "Error";
  }

  public static handleError(err: ErrorType): ApiError {
    // Log error in development
    // if (process.env.NODE_ENV === "development") {
    //   console.error({
    //     type: err.constructor.name,
    //     name: err.name,
    //     code: "code" in err ? err.code : undefined,
    //     message: err.message,
    //   });

    // }

    if (err instanceof ApiError) return err;

    try {
      const errorName = this.getErrorName(err);
      const errorMapping = ERROR_MAPPINGS[errorName];

      if (errorMapping) {
        const { status, handle } = errorMapping;
        const { details } = handle(err);
        return new ApiError(details, status);
      }
    } catch (error) {
      console.error("Error handling failed:", error);
    }

    // Default error handling
    return new ApiError(err.message, "INTERNAL_SERVER_ERROR");
  }
}

const globalError = (
  err: ErrorType,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = ErrorHandler.handleError(err);
  error.send(res);
  next();
};

export default globalError;
