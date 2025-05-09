/* eslint-disable @typescript-eslint/no-explicit-any */
import { body, ValidationChain } from "express-validator";
import { Model } from "mongoose";

export default function generateValidator(
  model: Model<any>,
  excludeFields: string[] = [],
  mode: "create" | "update"
): ValidationChain[] {
  const schemaPaths = model.schema.paths;
  const validators: ValidationChain[] = [];

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

    let validator = body(key);

    // Handle create vs update mode
    if (mode === "update") {
      validator = validator.optional();
    } else {
      // For create, mark fields like createdAt and updatedAt as optional
      if (key === "createdAt" || key === "updatedAt") {
        validator = validator.optional();
      } else {
        validator = validator.exists().withMessage(`${key} is required`);
      }
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
