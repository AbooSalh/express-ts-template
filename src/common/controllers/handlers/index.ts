/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import ApiSuccess from "@/common/utils/api/ApiSuccess";
import expressAsyncHandler from "express-async-handler";
import { Model } from "mongoose";
import baseServices from "../services";
import validatorMiddleware from "@/common/middleware/validators/validator";
import { body, oneOf, param, ValidationChain } from "express-validator";
import generateValidator from "@/common/utils/validatorsGenerator";

type ValidatorMap = {
  [field: string]: ValidationChain[];
};

type CustomValidatorOptions = {
  create?: ValidatorMap;
  update?: ValidatorMap;
};

type ExcludedData =
  | string[]
  | {
      create: string[];
      update: string[];
    };

export default function baseController(
  model: Model<any>,
  excludedData: ExcludedData = [],
  excludeValidation: string[] = [],
  customValidators: CustomValidatorOptions = {}
) {
  // Normalize excludedData
  const normalizedExcludedData: { create: string[]; update: string[] } =
    Array.isArray(excludedData)
      ? { create: [...excludedData], update: [...excludedData] }
      : {
          create: [...excludedData.create],
          update: [...excludedData.update],
        };

  // Always exclude 'slug' and 'id'
  normalizedExcludedData.create.push("slug", "id");
  normalizedExcludedData.update.push("slug", "id");
  excludeValidation.push("slug", "id");

  const s = baseServices(model);

  const updatableFields = Object.keys(model.schema.paths).filter(
    (key) =>
      !normalizedExcludedData.update.includes(key) &&
      key !== "_id" &&
      key !== "__v" &&
      !key.includes(".")
  );

  const buildCustomValidators = (map: ValidatorMap) =>
    Object.values(map).flat();

  return {
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
    update: {
      handler: expressAsyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const updatedData = req.body;
        const result = await s.update(
          id,
          updatedData,
          normalizedExcludedData.update
        );
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
    getOne: {
      handler: expressAsyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const result = await s.getOne(id);
        ApiSuccess.send(res, "OK", "document found", result);
      }),
      validator: [
        param("id").exists().withMessage("id is required").isMongoId(),
        validatorMiddleware,
      ],
    },
    getAll: {
      handler: expressAsyncHandler(async (req: Request, res: Response) => {
        const result = await s.getAll(req.body);
        ApiSuccess.send(res, "OK", "documents found", result);
      }),
      validator: [],
    },
  };
}
