/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import ApiSuccess from "@/common/utils/api/ApiSuccess";
import expressAsyncHandler from "express-async-handler";
import { Model } from "mongoose";
import baseServices from "../services";
import validatorMiddleware from "@/common/middleware/validators/validator";
import { body, oneOf, param, ValidationChain } from "express-validator";
import generateValidator from "@/common/utils/validatorsGenerator";

/**
 * Type definition for a map of validators for specific fields.
 */
type ValidatorMap = {
  [field: string]: ValidationChain[];
};

/**
 * Custom validator options for create and update operations.
 */
type CustomValidatorOptions = {
  create?: ValidatorMap;
  update?: ValidatorMap;
};

/**
 * Fields to exclude from create/update operations.
 * Can be a flat list or split by create/update.
 */
type ExcludedData =
  | string[]
  | {
      create?: string[];
      update?: string[];
    };

/**
 * Options object to configure the base controller.
 */
type BaseControllerOptions = {
  excludedData?: ExcludedData;
  excludeValidation?: string[];
  customValidators?: CustomValidatorOptions;
};

/**
 * Base controller factory that generates CRUD handlers and validators
 * for a given Mongoose model.
 *
 * @param model - The Mongoose model to operate on
 * @param options - Optional settings for exclusion and validation
 * @returns Object with Express-compatible route handlers and validators
 */
export default function baseController(
  model: Model<any>,
  {
    excludedData = [],
    excludeValidation = [],
    customValidators = {},
  }: BaseControllerOptions = {}
) {
  // Normalize excludedData to always have 'create' and 'update' arrays
  const normalizedExcludedData: { create: string[]; update: string[] } =
    Array.isArray(excludedData)
      ? { create: [...excludedData], update: [...excludedData] }
      : {
          create: [...(excludedData.create || [])],
          update: [...(excludedData.update || [])],
        };

  // Always exclude 'slug' and 'id' from data and validation
  normalizedExcludedData.create.push("slug", "id");
  normalizedExcludedData.update.push("slug", "id");
  excludeValidation.push("slug", "id");

  // Base service with standard CRUD operations
  const s = baseServices(model);

  // Determine which fields are updatable
  const updatableFields = Object.keys(model.schema.paths).filter(
    (key) =>
      !normalizedExcludedData.update.includes(key) &&
      key !== "_id" &&
      key !== "__v" &&
      !key.includes(".")
  );

  // Flatten the validator map into a single array of express-validator chains
  const buildCustomValidators = (map: ValidatorMap) =>
    Object.values(map).flat();

  // Return CRUD controller object
  return {
    /**
     * Delete a document by ID
     */
    deleteOne: {
      handler: expressAsyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await s.deleteOne(id);
        ApiSuccess.send(res, "OK", "document deleted", result);
      }),
      validator: [
        param("id").exists().withMessage("id is required").isMongoId(),
        validatorMiddleware,
      ],
    },

    /**
     * Update a document by ID
     */
    update: {
      handler: expressAsyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const updatedData = req.body;
        const result = await s.update(
          id,
          updatedData,
          normalizedExcludedData.update
        );
        result.save();
        ApiSuccess.send(res, "OK", "document updated", result);
      }),
      validator: [
        param("id").exists().withMessage("id is required").isMongoId(),
        oneOf(
          updatableFields.map((field) =>
            body(field).exists().withMessage(`${field} must be provided`)
          ),
          {
            message: "At least one valid field must be provided to update",
          }
        ),
        ...buildCustomValidators(customValidators.update || {}),
        ...generateValidator(model, excludeValidation, "update"),
        validatorMiddleware,
      ],
    },

    /**
     * Create a new document
     */
    create: {
      handler: expressAsyncHandler(async (req: Request, res: Response) => {
        const data = req.body;
        const result = await s.create(data, normalizedExcludedData.create);
        ApiSuccess.send(res, "CREATED", "document created", result);
      }),
      validator: [
        ...buildCustomValidators(customValidators.create || {}),
        ...generateValidator(model, excludeValidation, "create"),
        validatorMiddleware,
      ],
    },

    /**
     * Retrieve a document by ID
     */
    getOne: {
      handler: expressAsyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const queryParams: { [key: string]: string } = {};
        Object.entries(req.query).forEach(([key, value]) => {
          if (typeof value === "string") queryParams[key] = value;
          else if (Array.isArray(value)) queryParams[key] = value.join(",");
          else if (value !== undefined) queryParams[key] = String(value);
        });
        const result = await s.getOne(id, queryParams);
        ApiSuccess.send(res, "OK", "document found", result);
      }),
      validator: [
        param("id").exists().withMessage("id is required").isMongoId(),
        validatorMiddleware,
      ],
    },

    /**
     * Retrieve all documents (with query filters, if provided)
     */
    getAll: {
      handler: expressAsyncHandler(async (req: Request, res: Response) => {
        const queryParams: { [key: string]: string } = {};
        Object.entries(req.query).forEach(([key, value]) => {
          if (typeof value === "string") queryParams[key] = value;
          else if (Array.isArray(value)) queryParams[key] = value.join(",");
          else if (value !== undefined) queryParams[key] = String(value);
        });
        const result = await s.getAll(queryParams);
        ApiSuccess.send(res, "OK", "documents found", result);
      }),
      validator: [],
    },
  };
}
