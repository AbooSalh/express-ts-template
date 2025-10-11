import type { Error as MongooseError } from "mongoose";
import { ErrorHandler, ErrorType, MongoServerError } from "../types/error";

const isValidationError = (
  err: ErrorType
): err is MongooseError.ValidationError => {
  return err.name === "ValidationError";
};

const isMongoServerError = (err: ErrorType): err is MongoServerError => {
  return (
    err.name === "MongoServerError" || (err as MongoServerError).code === 11000
  );
};

const isCastError = (err: ErrorType): err is MongooseError.CastError => {
  return err.name === "CastError";
};

// Additional, safe type-narrowing helpers (using names only to avoid type dependency changes)
const isDocumentNotFoundError = (err: ErrorType): boolean => {
  return err.name === "DocumentNotFoundError";
};

const isVersionError = (err: ErrorType): boolean => {
  return err.name === "VersionError";
};

const isStrictModeError = (err: ErrorType): boolean => {
  return err.name === "StrictModeError";
};

// Some drivers may surface bulk write errors under a different name
const isMongoBulkWriteError = (err: ErrorType): boolean => {
  // Older driver names could be "MongoBulkWriteError"; also check writeErrors array
  return (
    err.name === "MongoBulkWriteError" ||
    (typeof (err as any)?.code === "number" && (err as any)?.code === 11000) ||
    Array.isArray((err as any)?.writeErrors)
  );
};

export const ERROR_MAPPINGS: Record<string, ErrorHandler> = {
  ValidationError: {
    status: "UNPROCESSABLE_ENTITY",
    handle: (err: ErrorType) => {
      if (!isValidationError(err)) throw err;

      // Safely handle errors object
      const errors = err.errors || {};
      const errorMessages = Object.values(errors)
        .map((error) => error?.message || "Validation error")
        .filter(Boolean);

      return {
        message:
          errorMessages.length > 0
            ? errorMessages.join(", ")
            : "Validation error",
        details: Object.entries(errors).map(([field, error]) => ({
          field,
          value: (error as any)?.value,
          message: (error as any)?.message || "Validation error",
          code: "VALIDATION_ERROR",
        })),
      };
    },
  },
  MongoServerError: {
    status: "UNPROCESSABLE_ENTITY",
    handle: (err: ErrorType) => {
      if (!isMongoServerError(err)) throw err;

      // Safely extract key pattern and value
      const keyPattern = (err as any).keyPattern || {};
      const keyValue = (err as any).keyValue || {};
      const field = Object.keys(keyPattern)[0] || Object.keys(keyValue)[0] || "field";
      const value = (field && keyValue[field] !== undefined)
        ? (keyValue as any)[field]
        : Object.values(keyValue)[0] || "value";

      return {
        message: `${field} '${value}' already exists`,
        details: [
          {
            field,
            value: String(value),
            message: "Must be unique",
            code: "DUPLICATE_KEY",
          },
        ],
      };
    },
  },
  // Support alternate driver name for duplicate key / bulk write
  MongoBulkWriteError: {
    status: "UNPROCESSABLE_ENTITY",
    handle: (err: ErrorType) => {
      if (!isMongoBulkWriteError(err)) throw err;
      const writeErrors = (err as any)?.writeErrors || [];
      const first = writeErrors[0] || {};
      const keyPattern = first?.keyPattern || (err as any)?.keyPattern || {};
      const keyValue = first?.keyValue || (err as any)?.keyValue || {};
      const field = Object.keys(keyPattern)[0] || Object.keys(keyValue)[0] || "field";
      const value = (field && keyValue[field] !== undefined)
        ? (keyValue as any)[field]
        : Object.values(keyValue)[0] || "value";
      return {
        message: `${field} '${value}' already exists`,
        details: [
          { field, value: String(value), message: "Must be unique", code: "DUPLICATE_KEY" },
        ],
      };
    },
  },
  CastError: {
    status: "BAD_REQUEST",
    handle: (err: ErrorType) => {
      if (!isCastError(err)) throw err;

      // Safely extract path and value
      const path = (err as any).path || "field";
      const value = (err as any).value ?? "unknown";
      const kind = (err as any).kind || "invalid";

      return {
        message: `Invalid ${path}: ${value} (expected ${kind})`,
        details: [
          {
            field: path,
            value: String(value),
            message: `Invalid value type (expected ${kind})`,
            code: "INVALID_TYPE",
          },
        ],
      };
    },
  },
  DocumentNotFoundError: {
    status: "NOT_FOUND",
    handle: (err: ErrorType) => {
      if (!isDocumentNotFoundError(err)) throw err;
      const path = (err as any).path || "document";
      const value = (err as any).value ?? undefined;
      return {
        message: `Document not found${value !== undefined ? ` for ${path}: ${value}` : ""}`,
        details: [
          {
            field: String(path),
            value: value !== undefined ? String(value) : undefined,
            message: "The requested document does not exist",
            code: "NOT_FOUND",
          },
        ],
      };
    },
  },
  VersionError: {
    status: "CONFLICT",
    handle: (err: ErrorType) => {
      if (!isVersionError(err)) throw err;
      const version = (err as any).version || (err as any).data?.version;
      return {
        message: "Document version conflict",
        details: [
          {
            message: version !== undefined
              ? `Attempted to update an outdated document version (${version})`
              : "Attempted to update an outdated document version",
            code: "VERSION_CONFLICT",
          },
        ],
      };
    },
  },
  StrictModeError: {
    status: "BAD_REQUEST",
    handle: (err: ErrorType) => {
      if (!isStrictModeError(err)) throw err;
      return {
        message: "Strict mode violation",
        details: [
          {
            message: err.message || "Provided field(s) are not allowed by the schema",
            code: "STRICT_MODE_VIOLATION",
          },
        ],
      };
    },
  },
  SyntaxError: {
    status: "BAD_REQUEST",
    handle: (err: ErrorType) => {
      return {
        message: "Invalid request syntax",
        details: [
          {
            message: err.message || "Malformed JSON or invalid input",
            code: "INVALID_SYNTAX",
          },
        ],
      };
    },
  },
};
