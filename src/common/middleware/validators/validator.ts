/* eslint-disable @typescript-eslint/no-explicit-any */
import ApiError from "@/common/utils/api/ApiError";
import type { Request, Response, NextFunction } from "express";
import { validationResult, ValidationError } from "express-validator";

interface ApiErrorDetail {
  message: string;
  field?: string;
  value?: string;
}

export default function validatorMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages: ApiErrorDetail[] = [];
    
    // Handle validation errors
    errors.array().forEach((err: ValidationError) => {
      // Handle Mongoose CastError
      if (err.type === 'field' && err.msg.includes('Cast to ObjectId failed')) {
        errorMessages.push({
          message: `Invalid ID format for ${err.path}`,
          field: err.path,
          value: (err as any).value
        });
      } else {
        errorMessages.push({
          message: err.msg,
          field: (err as any).path,
          value: (err as any).value
        });
      }
    });

    return next(new ApiError(errorMessages, "BAD_REQUEST"));
  }
  next();
}