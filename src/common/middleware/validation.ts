import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import expressAsyncHandler from "express-async-handler";
import ApiError from "@/common/utils/api/ApiError";

export const validate = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = errors.array().map(error => ({
        message: error.msg,
        field: error.type === 'field' ? error.path : undefined,
        value: error.type === 'field' ? error.value : undefined
      }));
      
      throw new ApiError(validationErrors, "BAD_REQUEST");
    }
    next();
  }
);

// Common validation rules
export const commonValidations = {
  // MongoDB ObjectId validation
  mongoId: (field: string) => [
    body(field)
      .isMongoId()
      .withMessage(`${field} must be a valid MongoDB ObjectId`),
  ],

  // Pagination validation
  pagination: [
    body("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    body("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],

  // Search validation
  search: [
    body("query")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Search query must be between 1 and 100 characters"),
  ],
};
