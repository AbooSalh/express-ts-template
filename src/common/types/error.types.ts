import { Error as MongooseError } from "mongoose";
import { HttpErrorStatus } from "./api.types";

export interface MongoServerError extends Error {
  code: number;
  keyPattern: Record<string, unknown>;
  keyValue: Record<string, unknown>;
}

export interface ErrorDetail {
  field?: string;
  value?: string;
  message: string;
  code?: string;
}

export interface ErrorHandlerResult {
  message: string;
  details: ErrorDetail[];
}

export type ErrorType =
  | MongooseError.ValidationError
  | MongooseError.CastError
  | MongoServerError
  | Error;

export interface ErrorHandler {
  status: HttpErrorStatus;
  handle: (err: ErrorType) => ErrorHandlerResult;
}
