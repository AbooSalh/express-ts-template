import { body, param, query } from "express-validator";
import validatorMiddleware from "@/common/middleware/validators/validator";

// Upload validator
export const uploadValidator = [
  body("folder")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9/_-]+$/)
    .withMessage(
      "Folder must contain only letters, numbers, hyphens, underscores, and forward slashes"
    ),
  validatorMiddleware,
];

// Update validator for base image properties only (non-localized)
export const updateValidator = [
  param("id").isMongoId().withMessage("Invalid image ID"),
  body("folder")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9/_-]+$/)
    .withMessage(
      "Folder must contain only letters, numbers, hyphens, underscores, and forward slashes"
    ),
  validatorMiddleware,
];

// Get one validator
export const getOneValidator = [
  param("id").isMongoId().withMessage("Invalid image ID"),
  query("language")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 2 })
    .matches(/^[a-z]{2}$/)
    .withMessage("Language must be a valid 2-letter language code"),
  validatorMiddleware,
];

// Delete validator
export const deleteValidator = [
  param("id").isMongoId().withMessage("Invalid image ID"),
  query("force")
    .optional()
    .isBoolean()
    .withMessage("Force parameter must be a boolean"),
  validatorMiddleware,
];

// List validator (for query parameters)
export const listValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50"),
  query("sort")
    .optional()
    .isString()
    .trim()
    .withMessage("Sort must be a string"),
  query("fields")
    .optional()
    .isString()
    .trim()
    .withMessage("Fields must be a string"),
  query("folder")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9/_-]+$/)
    .withMessage(
      "Folder must contain only letters, numbers, hyphens, underscores, and forward slashes"
    ),
  query("tags")
    .optional()
    .isString()
    .trim()
    .withMessage("Tags must be a string"),
  validatorMiddleware,
];

// Bulk delete validator
export const bulkDeleteValidator = [
  body("ids").isArray({ min: 1 }).withMessage("IDs array is required"),
  body("ids.*")
    .isMongoId()
    .withMessage("Each ID must be a valid MongoDB ObjectId"),
  body("force")
    .optional()
    .isBoolean()
    .withMessage("Force flag must be boolean"),
  validatorMiddleware,
];

// Get localized content validator
export const getLocalizedContentValidator = [
  param("id").isMongoId().withMessage("Invalid image ID"),
  validatorMiddleware,
];

// Upsert localized content validator
export const upsertLocalizedContentValidator = [
  param("id").isMongoId().withMessage("Invalid image ID"),
  body("language")
    .notEmpty()
    .isString()
    .trim()
    .isLength({ min: 2, max: 2 })
    .matches(/^[a-z]{2}$/)
    .withMessage("Language must be a valid 2-letter language code"),
  body("alt")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Alt text must be between 1 and 500 characters"),
  body("title")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be between 1 and 200 characters"),
  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Description must be between 1 and 1000 characters"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  validatorMiddleware,
];

// Delete localized content validator
export const deleteLocalizedContentValidator = [
  param("id").isMongoId().withMessage("Invalid image ID"),
  param("language")
    .isString()
    .trim()
    .isLength({ min: 2, max: 2 })
    .matches(/^[a-z]{2}$/)
    .withMessage("Language must be a valid 2-letter language code"),
  validatorMiddleware,
];
