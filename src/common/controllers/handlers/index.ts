/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import ApiSuccess from "@/common/utils/api/ApiSuccess";
import expressAsyncHandler from "express-async-handler";
import {
  createBaseService,
  ServiceTranslationConfig,
} from "@/common/controllers/services";

import { BaseControllerConfig } from "./types";
import { processDocument, processResponse } from "./processing";
import { getProcessorDependencies, runMiddleware, customSort } from "./utils";
import { runSchemaValidators } from "./validation";

/**
 * BaseController class that provides a declarative way to create CRUD controllers
 * with comprehensive customization hooks for all stages of request/response processing.
 * Now uses the unified service pattern for cleaner, more maintainable code.
 *
 * @example
 * ```typescript
 * const tourController = new BaseController({
 *   model: Tour,
 *   translation: {
 *     model: TourTranslation,
 *     foreignKey: 'tour',
 *     languageField: 'language',
 *     fallbackLanguage: 'en',
 *     autoDeleteTranslations: true
 *   },
 *   hiddenFields: {
 *     public: ["views", "clicks"],
 *     user: [],
 *     admin: []
 *   },
 *   processors: {
 *     activeOffer: (doc, req) => {
 *       const country = req.headers["x-country"] || "EN";
 *       return doc.offers.find(o => o.countries.includes(country));
 *     }
 *   },
 *   customSorts: {
 *     "activeOffer.price": (docs, isDesc) => docs.sort((a, b) =>
 *       isDesc ? b.activeOffer?.price - a.activeOffer?.price : a.activeOffer?.price - b.activeOffer?.price
 *     )
 *   }
 * });
 * ```
 */
export class BaseController {
  private readonly config: BaseControllerConfig;
  protected readonly service: ReturnType<typeof createBaseService>;

  /**
   * Creates a new BaseController instance with the provided configuration.
   * @param config - The controller configuration object
   */
  constructor(config: BaseControllerConfig) {
    this.config = config;

    // Create the unified service with translation support if configured
    this.service = createBaseService(
      config.model,
      this.buildTranslationConfig(),
      config.search
    );
  }

  /**
   * Builds translation configuration from the controller config
   */
  private buildTranslationConfig(): ServiceTranslationConfig | undefined {
    if (!this.config.localization?.enabled || !this.config.localization.model) {
      return undefined;
    }

    return {
      model: this.config.localization.model,
      foreignKey: this.config.localization.foreignKey,
      languageField: this.config.localization.languageField,
      fallbackLanguage: this.config.localization.fallbackLanguage,
      autoDeleteTranslations:
        this.config.translationManagement?.autoDeleteTranslations,
      allowedLanguages: this.config.translationManagement?.allowedLanguages,
    };
  }

  /**
   * Handles GET requests for retrieving multiple documents with filtering, sorting, and pagination.
   * Applies all configured hooks, processors, custom sorting, and field hiding.
   * @param req - Express request object (supports query parameters for filtering/sorting/pagination)
   * @param res - Express response object
   */
  getAll = expressAsyncHandler(async (req: Request, res: Response) => {
    // Apply middleware
    await runMiddleware(this.config.middleware?.beforeGetAll || [], req, res);

    let queryParams = req.query as any;

    // Request transform
    if (this.config.transforms?.requestTransform) {
      queryParams = this.config.transforms.requestTransform(queryParams, req);
    }

    // Before query hook
    if (this.config.queryHooks?.beforeQuery) {
      queryParams = await this.config.queryHooks.beforeQuery(queryParams, req);
    }

    // Check for custom sorts
    const hasCustomSort =
      queryParams.sort &&
      Object.keys(this.config.customSorts || {}).some((field) =>
        queryParams.sort?.includes(field)
      );

    let modifiedQuery = { ...queryParams };
    if (hasCustomSort) {
      delete modifiedQuery.sort; // Remove custom sort for base query
    }

    // Before limiting fields, ensure processor dependencies are included
    if (modifiedQuery.fields && this.config.processors) {
      const processorDependencies = getProcessorDependencies(
        modifiedQuery.fields,
        this.config
      );
      if (processorDependencies.length > 0) {
        // Add processor dependencies to the field selection
        const currentFields = modifiedQuery.fields
          .split(",")
          .map((f: string) => f.trim());
        const allFields = [
          ...new Set([...currentFields, ...processorDependencies]),
        ];
        modifiedQuery.fields = allFields.join(",");
      }
    }

    // Use the unified service to get data
    const serviceResult = await this.service.getAll({
      request: req,
      query: modifiedQuery,
    });

    let documents = serviceResult.data;

    // After query hook
    if (this.config.queryHooks?.afterQuery) {
      documents = await this.config.queryHooks.afterQuery(documents, req);
    }

    // Before processing collection hook
    if (this.config.dataHooks?.beforeProcessCollection) {
      documents = await this.config.dataHooks.beforeProcessCollection(
        documents,
        req,
        res
      );
    }

    let processedDocs = await Promise.all(
      documents.map((doc: any) => processDocument(doc, req, res, this.config))
    );

    // Apply custom sorting after processing
    if (hasCustomSort && queryParams.sort) {
      processedDocs = await customSort(
        processedDocs,
        queryParams.sort,
        req,
        this.config
      );
    }

    // After processing collection hook
    if (this.config.dataHooks?.afterProcessCollection) {
      processedDocs = await this.config.dataHooks.afterProcessCollection(
        processedDocs,
        req,
        res
      );
    }

    let result = {
      documents: processedDocs,
      pagination: serviceResult.pagination,
      _language: serviceResult._language,
      _availableLanguages: serviceResult._availableLanguages,
    };

    // Process final response
    result = await processResponse(result, req, res, this.config);

    ApiSuccess.send(res, "OK", "documents found", result);
  });

  /**
   * Handles GET requests for retrieving a single document by ID.
   * Applies all configured hooks, processors, and field hiding.
   * @param req - Express request object (expects req.params.id)
   * @param res - Express response object
   */
  getOne = expressAsyncHandler(async (req: Request, res: Response) => {
    // Apply middleware
    await runMiddleware(this.config.middleware?.beforeGetOne || [], req, res);

    const { id } = req.params;
    let queryParams = req.query as any;

    // Request transform
    if (this.config.transforms?.requestTransform) {
      queryParams = this.config.transforms.requestTransform(queryParams, req);
    }

    // Before query hook
    if (this.config.queryHooks?.beforeQuery) {
      queryParams = await this.config.queryHooks.beforeQuery(queryParams, req);
    }

    // Use the unified service to get data
    const serviceResult = await this.service.getOne(id, {
      request: req,
      query: queryParams,
    });

    let document = serviceResult.data;

    // After query hook
    if (this.config.queryHooks?.afterQuery) {
      document = await this.config.queryHooks.afterQuery(document, req);
    }

    let processed = await processDocument(document, req, res, this.config);

    // Process final response
    processed = await processResponse(processed, req, res, this.config);

    ApiSuccess.send(res, "OK", "document found", processed);
  });

  /**
   * Handles POST requests for creating new documents.
   * Applies validation, request transformation, and all processing hooks.
   * @param req - Express request object (expects data in req.body)
   * @param res - Express response object
   */
  create = expressAsyncHandler(async (req: Request, res: Response) => {
    // Apply middleware
    await runMiddleware(this.config.middleware?.beforeCreate || [], req, res);

    // Schema-based validation
    if (this.config.validation?.enabled) {
      await runSchemaValidators(req, this.config.model, "create", this.config);
    }

    let data = req.body;

    // Request transform
    if (this.config.transforms?.requestTransform) {
      data = this.config.transforms.requestTransform(data, req);
    }

    // Use the unified service to create data
    const serviceResult = await this.service.create(data, {
      request: req,
    });

    let processed = await processDocument(
      serviceResult.data,
      req,
      res,
      this.config
    );

    // Process final response
    processed = await processResponse(processed, req, res, this.config);

    ApiSuccess.send(res, "CREATED", "document created", processed);
  });

  /**
   * Handles PUT/PATCH requests for updating existing documents.
   * Applies validation, request transformation, and all processing hooks.
   * @param req - Express request object (expects req.params.id and data in req.body)
   * @param res - Express response object
   */
  update = expressAsyncHandler(async (req: Request, res: Response) => {
    // Apply middleware
    await runMiddleware(this.config.middleware?.beforeUpdate || [], req, res);

    // Schema-based validation
    if (this.config.validation?.enabled) {
      await runSchemaValidators(req, this.config.model, "update", this.config);
    }

    const { id } = req.params;
    let data = req.body;

    // Request transform
    if (this.config.transforms?.requestTransform) {
      data = this.config.transforms.requestTransform(data, req);
    }

    // Use the unified service to update data
    const serviceResult = await this.service.update(id, data, {
      request: req,
    });

    let processed = await processDocument(
      serviceResult.data,
      req,
      res,
      this.config
    );

    // Process final response
    processed = await processResponse(processed, req, res, this.config);

    ApiSuccess.send(res, "OK", "document updated", processed);
  });

  /**
   * Handles DELETE requests for removing documents by ID.
   * Applies middleware and validation before deletion.
   * Optionally deletes associated translations if translationManagement is enabled.
   * @param req - Express request object (expects req.params.id)
   * @param res - Express response object
   */
  delete = expressAsyncHandler(async (req: Request, res: Response) => {
    // Apply middleware
    await runMiddleware(this.config.middleware?.beforeDelete || [], req, res);

    const { id } = req.params;

    // Use the unified service to delete data (handles translation cleanup automatically)
    const serviceResult = await this.service.delete(id, {
      request: req,
    });

    let processed = serviceResult.data;

    // Process final response
    processed = await processResponse(processed, req, res, this.config);

    ApiSuccess.send(res, "OK", "document deleted", processed);
  });

  // ============= TRANSLATION MANAGEMENT METHODS =============

  /**
   * Creates a new translation for an existing base document
   * @param req - Express request object (expects req.params.id and translation data in req.body)
   * @param res - Express response object
   */
  createTranslation = expressAsyncHandler(
    async (req: Request, res: Response) => {
      if (!this.service.translation) {
        throw new Error(
          "Translation management is not configured for this controller"
        );
      }

      const { id } = req.params;
      const translationData = req.body;

      const translation = await this.service.translation.create(
        id,
        translationData
      );

      ApiSuccess.send(res, "CREATED", "translation created", translation);
    }
  );

  /**
   * Updates an existing translation
   * @param req - Express request object (expects req.params.id, req.params.language, and update data in req.body)
   * @param res - Express response object
   */
  updateTranslation = expressAsyncHandler(
    async (req: Request, res: Response) => {
      if (!this.service.translation) {
        throw new Error(
          "Translation management is not configured for this controller"
        );
      }

      const { id, language } = req.params;
      const updateData = req.body;

      const translation = await this.service.translation.update(
        id,
        language,
        updateData
      );

      ApiSuccess.send(res, "OK", "translation updated", translation);
    }
  );

  /**
   * Deletes a specific translation
   * @param req - Express request object (expects req.params.id and req.params.language)
   * @param res - Express response object
   */
  deleteTranslation = expressAsyncHandler(
    async (req: Request, res: Response) => {
      if (!this.service.translation) {
        throw new Error(
          "Translation management is not configured for this controller"
        );
      }

      const { id, language } = req.params;

      const translation = await this.service.translation.delete(id, language);

      ApiSuccess.send(res, "OK", "translation deleted", translation);
    }
  );

  /**
   * Gets all translations for a base document
   * @param req - Express request object (expects req.params.id)
   * @param res - Express response object
   */
  getTranslations = expressAsyncHandler(async (req: Request, res: Response) => {
    if (!this.service.translation) {
      throw new Error(
        "Translation management is not configured for this controller"
      );
    }

    const { id } = req.params;

    const translations = await this.service.translation.getAll(id);

    ApiSuccess.send(res, "OK", "translations found", { translations });
  });

  /**
   * Gets a specific translation by language
   * @param req - Express request object (expects req.params.id and req.params.language)
   * @param res - Express response object
   */
  getTranslation = expressAsyncHandler(async (req: Request, res: Response) => {
    if (!this.service.translation) {
      throw new Error(
        "Translation management is not configured for this controller"
      );
    }

    const { id, language } = req.params;

    const translation = await this.service.translation.getOne(id, language);

    if (!translation) {
      throw new Error(`Translation for language "${language}" not found`);
    }

    ApiSuccess.send(res, "OK", "translation found", translation);
  });

  /**
   * Creates or updates a translation (upsert)
   * @param req - Express request object (expects req.params.id, req.params.language, and translation data in req.body)
   * @param res - Express response object
   */
  upsertTranslation = expressAsyncHandler(
    async (req: Request, res: Response) => {
      if (!this.service.translation) {
        throw new Error(
          "Translation management is not configured for this controller"
        );
      }

      const { id, language } = req.params;
      const translationData = { ...req.body, language };

      const result = await this.service.translation.upsert(id, translationData);

      const message = result.created
        ? "translation created"
        : "translation updated";
      const status = result.created ? "CREATED" : "OK";

      ApiSuccess.send(res, status, message, result.translation);
    }
  );

  /**
   * Gets available languages for a base document
   * @param req - Express request object (expects req.params.id)
   * @param res - Express response object
   */
  getAvailableLanguages = expressAsyncHandler(
    async (req: Request, res: Response) => {
      if (!this.service.translation) {
        throw new Error(
          "Translation management is not configured for this controller"
        );
      }

      const { id } = req.params;

      const languages = await this.service.translation.getAvailableLanguages(
        id
      );

      ApiSuccess.send(res, "OK", "available languages found", { languages });
    }
  );
}
export default BaseController;
