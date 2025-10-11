/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request } from "express";
import { validationResult } from "express-validator";
import { Model } from "mongoose";
import generateValidator from "@/common/utils/validatorsGenerator";
import ApiError from "@/common/utils/api/ApiError";
import { BaseControllerConfig } from "./types";

/**
 * Runs validation against the request using validators generated from the Mongoose schema.
 *
 * @param req - The Express request object.
 * @param model - The Mongoose model to generate validators from.
 * @param mode - The validation mode, either 'create' or 'update'.
 * @param config - The BaseControllerConfig containing exclude information.
 * @throws {ApiError} If validation fails, throws an ApiError with validation details.
 */
export const runSchemaValidators = async (
  req: Request,
  model: Model<any>,
  mode: "create" | "update",
  config: BaseControllerConfig
): Promise<void> => {
  const validationConfig = config.validation;
  const excludeValidation = validationConfig?.exclude || [];

  // Get schema-based validators
  const schemaValidators = generateValidator(model, mode, excludeValidation);

  // Get custom validators for the current mode
  const customValidators = validationConfig?.custom?.[mode] || [];

  // Combine all validators
  const allValidators = [...schemaValidators, ...customValidators];

  // Run all validation chains against the request
  await Promise.all(allValidators.map((validator) => validator.run(req)));

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors for a clear API response
    const formattedErrors = errors.array().map((err: any) => ({
      field: err.path,
      message: err.msg,
    }));
    throw new ApiError(formattedErrors, "BAD_REQUEST");
  }
};
