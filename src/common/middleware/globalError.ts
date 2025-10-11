import type { NextFunction, Request, Response } from "express";
import { Error as MongooseError } from "mongoose";
import ApiError from "../utils/api/ApiError";
import { ERROR_MAPPINGS } from "../constants/error.constants";
import { ErrorType } from "../types/error";
import logger from "@/common/utils/logger";
import env from "@/common/config/env.config";

// Simple, safe error handler to prevent infinite recursion
const globalError = (
  err: ErrorType,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Prevent infinite recursion by checking if response has already been sent
  if (res.headersSent) {
    return;
  }

  try {
    // If it's already an ApiError, use it directly
    if (err instanceof ApiError) {
      err.send(res);
      return;
    }

    // Safely extract basic error information
    let errorMessage = "Internal Server Error";
    let errorName = "Error";
    let errorStack: string | undefined;

    try {
      errorMessage = err.message || "Internal Server Error";
      errorName = err.name || "Error";
      errorStack = err.stack;
    } catch {
      // If we can't extract error info, use safe defaults
      errorMessage = "Internal Server Error";
      errorName = "Error";
    }

    // Log error in development (safely)
    if (env.NODE_ENV === "development") {
      try {
        logger.error("Error occurred", {
          type: err.constructor.name,
          name: errorName,
          message: errorMessage,
          stack: errorStack,
        });
      } catch (logError) {
        // If logging fails, continue without it
        console.error("Failed to log error:", logError);
      }
    }

    // Try to handle specific error types safely
    let statusCode = 500;
    let statusMessage = "INTERNAL SERVER ERROR";
    let errorDetails = [{ message: errorMessage }];

    try {
      // Primary mapping by error name
      let errorMapping = ERROR_MAPPINGS[errorName];

      // Fallback: handle Mongo duplicate key errors even if name differs
      // Mongo unique index violation => code 11000
      if (!errorMapping && (err as any)?.code === 11000) {
        errorMapping = ERROR_MAPPINGS["MongoServerError"];
      }

      if (errorMapping) {
        const { status, handle } = errorMapping;
        try {
          const result = handle(err);
          statusCode = getStatusCode(status);
          statusMessage = status.replace(/_/g, " ");
          errorDetails = result.details;
          // Use mapped message as top-level message for consistency
          if (result.message) {
            errorMessage = result.message;
          }
        } catch (handleError) {
          // If error handling fails, fall back to default
          console.error("Error handling failed:", handleError);
        }
      }
    } catch (mappingError) {
      // If error mapping fails, continue with defaults
      console.error("Error mapping failed:", mappingError);
    }

    // Send the error response
    res.status(statusCode).json({
      statusCode,
      statusMessage,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      status: "error",
      errors: errorDetails,
      ...(env.NODE_ENV === "development" && { stack: errorStack }),
    });
  } catch (finalError) {
    // If everything fails, send a basic error response
    if (!res.headersSent) {
      res.status(500).json({
        statusCode: 500,
        statusMessage: "INTERNAL SERVER ERROR",
        message: "An unexpected error occurred",
        timestamp: new Date().toISOString(),
        status: "error",
        errors: [{ message: "An unexpected error occurred" }],
      });
    }
  }
};

// Helper function to get status code from error status
function getStatusCode(status: string): number {
  const statusMap: Record<string, number> = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
  };
  return statusMap[status] || 500;
}

export default globalError;
