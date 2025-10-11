/* eslint-disable @typescript-eslint/no-explicit-any */
import { body, ValidationChain } from "express-validator";
import { Model } from "mongoose";

/**
 * Extract required fields from a Mongoose schema
 * @param model - The Mongoose model
 * @returns Array of required field names
 */
export function extractRequiredFields(model: Model<any>): string[] {
  const schemaPaths = model.schema.paths;
  const requiredFields: string[] = [];

  for (const key in schemaPaths) {
    if (
      key === "__v" ||
      key === "_id" ||
      key.includes(".") // Skip nested paths for now
    ) {
      continue;
    }

    const path = schemaPaths[key];

    // Check if field is required
    // Handle both direct required property and array format [true, 'message']
    const isRequired =
      path.isRequired ||
      path.options?.required === true ||
      (Array.isArray(path.options?.required) &&
        path.options.required[0] === true);

    if (isRequired) {
      requiredFields.push(key);
    }
  }

  return requiredFields;
}

export default function generateValidator(
  model: Model<any>,
  mode: "create" | "update",
  excludeFields: string[] = []
): ValidationChain[] {
  const schemaPaths = model.schema.paths;
  const validators: ValidationChain[] = [];
  const requiredFields = extractRequiredFields(model);

  for (const key in schemaPaths) {
    if (
      excludeFields.includes(key) ||
      key === "__v" ||
      key === "_id" ||
      key.includes(".")
    ) {
      continue;
    }
    const path = schemaPaths[key];
    const isRequired = requiredFields.includes(key);

    let validator = body(key);

    // Handle create vs update mode
    if (mode === "update") {
      validator = validator.optional();
    } else if (key === "createdAt" || key === "updatedAt") {
      // Always make timestamps optional even if they're marked as required
      validator = validator.optional();
    } else if (isRequired) {
      validator = validator.exists().withMessage(`${key} is required`);
    } else {
      validator = validator.optional();
    }

    // Type-specific validation
    switch (path.instance) {
      case "String":
        validator = validator.isString().withMessage(`${key} must be a string`);
        break;
      case "Number":
        validator = validator
          .isNumeric()
          .withMessage(`${key} must be a number`);
        break;
      case "Boolean":
        validator = validator
          .isBoolean()
          .withMessage(`${key} must be true/false`);
        break;
      case "ObjectID":
        validator = validator
          .isMongoId()
          .withMessage(`${key} must be a valid Mongo ID`);
        break;
      default:
    }

    validators.push(validator);
  }
  return validators;
}
