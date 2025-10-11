/**
 * @fileoverview Unified Base Service Factory
 * @description Provides a single createBaseService() factory function that optionally enables translation features.
 * Eliminates code duplication between translated and non-translated services with consistent API across all services.
 * @author Paradise Sharm Tours Development Team
 * @version 1.0.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model } from "mongoose";
import { Request } from "express";
import { sanitizeMongooseData } from "@/common/utils/sanitizeData";
import { filterExcludedKeys } from "@/common/utils/filterExcludedKeys";
import { flattenToDotNotation } from "@/common/utils/flattenToDotNotation";
import { ApiFeatures, IRequestQuery } from "@/common/utils/api/ApiFeatures";
import ApiError from "@/common/utils/api/ApiError";
import { languageService } from "./languageService";
import LocalizationService from "./localizationService";
import TranslationManager, {
  TranslationConfig,
  TranslationCreateData,
  TranslationUpdateData,
} from "./translationManager";

/**
 * Translation configuration for the service
 */
export interface ServiceTranslationConfig {
  /** Translation model to use */
  model: Model<any>;
  /** Foreign key field name (defaults to base model name) */
  foreignKey?: string;
  /** Language field name (defaults to 'language') */
  languageField?: string;
  /** Fallback language (defaults to system default) */
  fallbackLanguage?: string;
  /** Auto-delete translations when base document is deleted (defaults to true) */
  autoDeleteTranslations?: boolean;
  /** Allowed languages for this service (optional) */
  allowedLanguages?: string[];
}

/**
 * Search configuration for the service
 */
export interface ServiceSearchConfig {
  /** Default fields to search in (for localized models, these should be translation model fields) */
  fields?: string[];
  /** Fields to search in on the BASE model (used when localization is disabled) */
  baseFields?: string[];
  /** Fields to search in on the TRANSLATION model (used when localization is enabled) */
  localizedFields?: string[];
  /** Allow dynamic search fields via query parameter ?searchFields=field1,field2 */
  allowDynamicFields?: boolean;
  /** Case-sensitive search (default: false) */
  caseSensitive?: boolean;
  /** Query parameter name for dynamic fields (default: 'searchFields') */
  fieldsParam?: string;
}

/**
 * Options for service operations
 */
export interface ServiceOptions {
  /** Language for localized operations */
  language?: string;
  /** Request object for language detection */
  request?: Request;
  /** Fields to exclude from operations */
  excludeFields?: string[];
  /** Additional query parameters */
  query?: IRequestQuery;
}

/**
 * Service result with metadata
 */
export interface ServiceResult<T = any> {
  /** The actual data */
  data: T;
  /** Language used for localization */
  _language?: string | null;
  /** Available languages for this document */
  _availableLanguages?: string[];
  /** Pagination info (for getAll operations) */
  pagination?: any;
}

/**
 * Translation operation result
 */
export interface TranslationResult {
  /** The translation data */
  translation: any;
  /** Whether this was a create or update operation */
  created: boolean;
}

/**
 * Base service interface
 */
export interface BaseService {
  /** Get all documents with optional localization */
  getAll(options?: ServiceOptions): Promise<ServiceResult<any[]>>;

  /** Get one document by ID with optional localization */
  getOne(id: string, options?: ServiceOptions): Promise<ServiceResult<any>>;

  /** Create a new document */
  create(data: any, options?: ServiceOptions): Promise<ServiceResult<any>>;

  /** Update an existing document */
  update(
    id: string,
    data: any,
    options?: ServiceOptions
  ): Promise<ServiceResult<any>>;

  /** Delete a document */
  delete(id: string, options?: ServiceOptions): Promise<ServiceResult<any>>;

  /** Translation management methods (only available if translation is configured) */
  translation?: {
    /** Create a new translation */
    create: (
      id: string,
      translationData: TranslationCreateData
    ) => Promise<any>;

    /** Update an existing translation */
    update: (
      id: string,
      language: string,
      updateData: TranslationUpdateData
    ) => Promise<any>;

    /** Delete a translation */
    delete: (id: string, language: string) => Promise<any>;

    /** Get all translations for a document */
    getAll: (id: string) => Promise<any[]>;

    /** Get a specific translation */
    getOne: (id: string, language: string) => Promise<any | null>;

    /** Create or update translation (upsert) */
    upsert: (
      id: string,
      translationData: TranslationCreateData
    ) => Promise<TranslationResult>;

    /** Get available languages for a document */
    getAvailableLanguages: (id: string) => Promise<string[]>;

    /** Check if translation exists */
    exists: (id: string, language: string) => Promise<boolean>;
  };
}

/**
 * Creates a unified base service with optional translation features
 *
 * @param baseModel - The main Mongoose model
 * @param translationConfig - Optional translation configuration
 * @returns BaseService instance with consistent API
 *
 * @example
 * ```typescript
 * // Simple service without translations
 * const categoryService = createBaseService(CategoryModel);
 *
 * // Service with translation support
 * const categoryService = createBaseService(CategoryModel, {
 *   translation: {
 *     model: CategoryTranslationModel,
 *     foreignKey: 'category', // optional, defaults to model name
 *     languageField: 'language', // optional, defaults to 'language'
 *     fallbackLanguage: 'en', // optional, defaults to system default
 *     autoDeleteTranslations: true // optional, defaults to true
 *   }
 * });
 *
 * // Usage examples
 * const category = await categoryService.getOne('123');
 * const localizedCategory = await categoryService.getOne('123', { language: 'ar' });
 *
 * // Translation management (only available if configured)
 * await categoryService.translation?.create('123', { language: 'ar', title: 'عنوان' });
 * await categoryService.translation?.upsert('123', { language: 'fr', title: 'Titre' });
 * ```
 */
export function createBaseService(
  baseModel: Model<any>,
  translationConfig?: ServiceTranslationConfig,
  searchConfig?: ServiceSearchConfig
): BaseService {
  const hasTranslation = !!translationConfig;

  // Build translation configuration
  const buildTranslationConfig = (): TranslationConfig => {
    if (!translationConfig) {
      throw new ApiError(
        "Translation not configured for this service",
        "BAD_REQUEST"
      );
    }

    return {
      model: translationConfig.model,
      foreignKey:
        translationConfig.foreignKey || baseModel.modelName.toLowerCase(),
      languageField: translationConfig.languageField || "language",
      fallbackLanguage: translationConfig.fallbackLanguage || "en",
      allowedLanguages: translationConfig.allowedLanguages,
    };
  };

  // Get language from options or request
  const getLanguage = async (options?: ServiceOptions): Promise<string> => {
    if (options?.language) {
      return options.language;
    }

    if (options?.request) {
      return LocalizationService.getLanguageFromRequest(options.request);
    }

    return await languageService.getDefaultLanguage();
  };

  // Localize document(s)
  const localizeDocument = async (
    document: any,
    language: string
  ): Promise<any> => {
    if (!hasTranslation || !document) return document;

    const config = buildTranslationConfig();
    const localizationConfig = {
      model: config.model,
      foreignKey: config.foreignKey,
      languageField: config.languageField,
      fallbackLanguage: config.fallbackLanguage,
    };

    return await LocalizationService.getLocalizedDocument(
      document,
      localizationConfig,
      language
    );
  };

  const localizeDocuments = async (
    documents: any[],
    language: string
  ): Promise<any[]> => {
    if (!hasTranslation || !documents?.length) return documents;

    const config = buildTranslationConfig();
    const localizationConfig = {
      model: config.model,
      foreignKey: config.foreignKey,
      languageField: config.languageField,
      fallbackLanguage: config.fallbackLanguage,
    };

    return await LocalizationService.getLocalizedDocuments(
      documents,
      localizationConfig,
      language
    );
  };

  // Get available languages for a document
  const getAvailableLanguages = async (id: string): Promise<string[]> => {
    if (!hasTranslation) return [];

    const config = buildTranslationConfig();
    return await TranslationManager.getAvailableLanguages(id, config);
  };

  /**
   * Handles getAll for translated models with proper field filtering
   */
  const getAllWithTranslation = async (
    query: any,
    language: string
  ): Promise<ServiceResult<any[]>> => {
    // Extract field filtering from query
    const { fields, hide, ...otherQuery } = query;

    // Split filters into base and translation filters
    const baseFilters: any = {};
    const translationFilters: any = {};
    const reserved = [
      "sort",
      "fields",
      "hide",
      "keywords",
      "search",
      "q",
      "page",
      "limit",
      "populate",
      "lang",
      "language",
    ];
    for (const [key, value] of Object.entries(otherQuery)) {
      if (reserved.includes(key)) continue;
      if (key.startsWith("localized.")) {
        translationFilters[key.replace("localized.", "")] = value;
      } else {
        baseFilters[key] = value;
      }
    }
    

    let filteredBaseIds: string[] | undefined = undefined;
    if (Object.keys(translationFilters).length > 0 && hasTranslation) {
      // Query the translation model for matching base IDs with fallback
      const config = buildTranslationConfig();
      
      // Try requested language first
      let translationQuery = {
        ...translationFilters,
        [config.languageField]: language,
      };
      
      let translationDocs = await config.model
        .find(translationQuery, { [config.foreignKey]: 1 })
        .lean();
      
      // If no results and not fallback language, try fallback language
      if (translationDocs.length === 0 && language !== config.fallbackLanguage) {
        translationQuery = {
          ...translationFilters,
          [config.languageField]: config.fallbackLanguage,
        };
        
        translationDocs = await config.model
          .find(translationQuery, { [config.foreignKey]: 1 })
          .lean();
      }
      
      // If still no results, try any available language
      if (translationDocs.length === 0) {
        translationQuery = {
          ...translationFilters,
          // Remove language filter to search in any language
        };
        
        translationDocs = await config.model
          .find(translationQuery, { [config.foreignKey]: 1 })
          .lean();
      }
        
      filteredBaseIds = translationDocs
        .map((doc: any) => doc[config.foreignKey]?.toString())
        .filter(Boolean);
        
      if (filteredBaseIds.length === 0) {
        // No matches, return empty result
        return {
          data: [],
          _language: language,
          _availableLanguages: [],
          pagination: {
            currentPage: 1,
            limit: 20,
            totalPages: 0,
            totalResults: 0,
          },
        };
      }
      baseFilters._id = { $in: filteredBaseIds };
    }

    // Handle search on localized fields first
    let searchCategoryIds: string[] | null = null;
    const searchTerm = otherQuery.keywords || otherQuery.search || otherQuery.q;
    
    if (searchTerm && hasTranslation) {
      const config = buildTranslationConfig();
      
      // Determine search fields from configuration and query parameters
      let searchFields =
        searchConfig?.localizedFields ||
        searchConfig?.fields ||
        ['title', 'description'];
      
      // Allow dynamic search fields via query parameter if enabled
      if (searchConfig?.allowDynamicFields) {
        const fieldsParam = searchConfig.fieldsParam || 'searchFields';
        const dynamicFields = otherQuery[fieldsParam];
        if (dynamicFields) {
          // Parse comma-separated field names
          searchFields = typeof dynamicFields === 'string' 
            ? dynamicFields.split(',').map(f => f.trim()).filter(Boolean)
            : searchFields;
        }
      }
      
      // Build search conditions for the specified fields
      const searchOptions = searchConfig?.caseSensitive ? "" : "i";
      const searchConditions = searchFields.map((field: string) => ({
        [field]: { $regex: searchTerm, $options: searchOptions }
      }));
      
      // Search in the localized collection
      const localizedMatches = await config.model.find({
        $and: [
          { [config.languageField]: language },
          { $or: searchConditions },
        ],
      });

      searchCategoryIds = localizedMatches.map((doc: any) => doc[config.foreignKey]);
      
      // If no matches found, return empty result
      if (searchCategoryIds.length === 0) {
        return {
          data: [],
          _language: language,
          _availableLanguages: [],
          pagination: {
            currentPage: 1,
            limit: 20,
            totalPages: 0,
            totalResults: 0,
          },
        };
      }
    }

    // Rebuild query for ApiFeatures (excluding translation filters)
    // Separate find conditions from query parameters
    let findQuery = { ...baseFilters }; // Only actual MongoDB find conditions
    
    // Add search filter if we have search results
    if (searchCategoryIds) {
      findQuery._id = { $in: searchCategoryIds };
    }
    
    // Remove localized.* parameters from queryParams since we've already handled them
    const cleanedOtherQuery = { ...otherQuery };
    for (const key in cleanedOtherQuery) {
      if (key.startsWith('localized.')) {
        delete cleanedOtherQuery[key];
      }
    }
    const queryParams = { ...baseFilters, ...cleanedOtherQuery }; // All parameters for ApiFeatures
    
    // Apply ApiFeatures with proper query separation
    const apiFeatures = new ApiFeatures(baseModel.find(findQuery), queryParams);
    
    // Apply filtering (skip search since we handled it above)
    apiFeatures.filter();
    
    // Get count BEFORE sorting and pagination for accuracy
    const countQuery = apiFeatures.mongooseQuery.clone();
    const filteredCount = await countQuery.countDocuments();
    
    // Apply sorting and pagination
    apiFeatures.sort();
    apiFeatures.paginate(filteredCount);
    
    // Apply field selection and population
    apiFeatures.limitFields();
    apiFeatures.populate();
    
    // Get base documents
    const documents = await apiFeatures.mongooseQuery;

    // Apply localization (merge with translations)
    const localizedDocuments = await localizeDocuments(documents, language);

    // Apply field filtering AFTER localization
    const filteredDocuments = applyFieldFiltering(
      localizedDocuments,
      fields,
      hide
    );

    // Get available languages for each document
    const availableLanguages = await Promise.all(
      documents.map((doc: any) => getAvailableLanguages(doc._id.toString()))
    );

    // Get unique languages across all documents
    const uniqueLanguages = [...new Set(availableLanguages.flat())];

    return {
      data: filteredDocuments,
      _language: language,
      _availableLanguages: uniqueLanguages,
      pagination: apiFeatures.pagination,
    };
  };

  /**
   * Applies field filtering to localized documents
   */
  const applyFieldFiltering = (
    documents: any[],
    fields?: string,
    hide?: string
  ): any[] => {
    if (!fields && !hide) {
      return documents;
    }

    return documents.map((doc) => {
      if (fields) {
        const fieldList = fields.split(",").map((f) => f.trim());
        const filtered: any = {};

        fieldList.forEach((field) => {
          if (field === "_id" && doc._id) {
            filtered._id = doc._id;
          } else if (field.includes(".")) {
            // Only support one level of nesting (e.g., 'localized.description')
            const [parent, child] = field.split(".");
            if (
              doc[parent] &&
              typeof doc[parent] === "object" &&
              child in doc[parent]
            ) {
              filtered[parent] = filtered[parent] || {};
              filtered[parent][child] = doc[parent][child];
            }
          } else if (field in doc) {
            filtered[field] = doc[field];
          }
        });
        // Always include _id if present
        if (doc._id && !filtered._id) {
          filtered._id = doc._id;
        }
        return filtered;
      } else if (hide) {
        // (Keep your existing hide logic here)
        const hideList = hide.split(",").map((f) => f.trim());
        const filtered = { ...doc };
        hideList.forEach((field) => {
          delete filtered[field];
        });
        return filtered;
      }
      return doc;
    });
  };

  /**
   * Handles getOne for translated models with proper field filtering
   */
  const getOneWithTranslation = async (
    id: string,
    query: any,
    language: string
  ): Promise<ServiceResult<any>> => {
    // Extract field filtering from query
    const { fields, hide, ...otherQuery } = query;

    // Apply all other features (filtering, search) to base query
    const apiFeatures = new ApiFeatures(baseModel.findById(id), otherQuery);
    apiFeatures.filter().search();

    const document = await apiFeatures.mongooseQuery;
    if (!document) {
      throw new ApiError("Document not found", "NOT_FOUND");
    }

    // Apply localization (merge with translations)
    const localizedDocument = await localizeDocument(document, language);

    // Apply field filtering AFTER localization
    const filteredDocument = applyFieldFiltering(
      [localizedDocument],
      fields,
      hide
    )[0];

    // Get available languages
    const availableLanguages = await getAvailableLanguages(id);

    return {
      data: filteredDocument,
      _language: language,
      _availableLanguages: availableLanguages,
    };
  };

  const service: BaseService = {
    async getAll(options?: ServiceOptions): Promise<ServiceResult<any[]>> {
      const query = options?.query || {};
      const language = await getLanguage(options);

      // For translated models, we need to handle field filtering differently
      if (hasTranslation) {
        return await getAllWithTranslation(query, language);
      }

      // For non-translated models, apply configured base search fields before ApiFeatures
      const { keywords, search, q } = query as any;
      const searchTerm = keywords || search || q;

      // Determine base search fields (configurable)
      let baseSearchFields =
        searchConfig?.baseFields ||
        searchConfig?.fields ||
        ["title", "description", "name"]; // default fallback

      // Allow dynamic fields via query when enabled
      if (searchConfig?.allowDynamicFields) {
        const fieldsParam = searchConfig.fieldsParam || "searchFields";
        const dynamicFields = (query as any)[fieldsParam];
        if (typeof dynamicFields === "string" && dynamicFields.trim()) {
          baseSearchFields = dynamicFields
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean);
        }
      }

      // Build initial findQuery for base model
      let findQuery: Record<string, any> = {};
      if (searchTerm) {
        const searchOptions = searchConfig?.caseSensitive ? "" : "i";
        const searchConditions = baseSearchFields.map((field: string) => ({
          [field]: { $regex: searchTerm, $options: searchOptions },
        }));
        findQuery = { $or: searchConditions };
      }

      // Apply ApiFeatures with our findQuery and full query params
      const apiFeatures = new ApiFeatures(baseModel.find(findQuery), query);
      // Apply filtering (non-reserved params)
      apiFeatures.filter();

      // Count BEFORE sort/pagination
      const countQuery = apiFeatures.mongooseQuery.clone();
      const filteredCount = await countQuery.countDocuments();

      // Sorting, pagination, fields, populate
      apiFeatures.sort();
      apiFeatures.paginate(filteredCount);
      apiFeatures.limitFields();
      apiFeatures.populate();

      const documents = await apiFeatures.mongooseQuery;

      return {
        data: documents,
        _language: language,
        _availableLanguages: [],
        pagination: apiFeatures.pagination,
      };
    },

    async getOne(
      id: string,
      options?: ServiceOptions
    ): Promise<ServiceResult<any>> {
      const query = options?.query || {};
      const language = await getLanguage(options);

      // For translated models, handle field filtering after localization
      if (hasTranslation) {
        return await getOneWithTranslation(id, query, language);
      }

      // For non-translated models, use standard ApiFeatures
      const apiFeatures = new ApiFeatures(baseModel.findById(id), query);
      apiFeatures.filter().search().limitFields().populate();

      const document = await apiFeatures.mongooseQuery;

      if (!document) {
        throw new ApiError("Document not found", "NOT_FOUND");
      }

      return {
        data: document,
        _language: language,
        _availableLanguages: [],
      };
    },

    async create(
      data: any,
      options?: ServiceOptions
    ): Promise<ServiceResult<any>> {
      const excludeFields = options?.excludeFields || [];
      const filteredData = filterExcludedKeys(data, excludeFields);

      const document = await baseModel.create(filteredData);
      const sanitizedDocument = sanitizeMongooseData(document);

      const language = await getLanguage(options);
      const localizedDocument = await localizeDocument(
        sanitizedDocument,
        language
      );

      return {
        data: localizedDocument,
        _language: language,
      };
    },

    async update(
      id: string,
      data: any,
      options?: ServiceOptions
    ): Promise<ServiceResult<any>> {
      const excludeFields = options?.excludeFields || [];
      const filteredData = filterExcludedKeys(data, excludeFields);
      const dotData = flattenToDotNotation(filteredData);

      const document = await baseModel.findByIdAndUpdate(
        id,
        { $set: dotData },
        { new: true, runValidators: true }
      );

      if (!document) {
        throw new ApiError("Document not found", "NOT_FOUND");
      }

      const sanitizedDocument = sanitizeMongooseData(document);
      const language = await getLanguage(options);
      const localizedDocument = await localizeDocument(
        sanitizedDocument,
        language
      );

      return {
        data: localizedDocument,
        _language: language,
      };
    },

    async delete(
      id: string,
      options?: ServiceOptions
    ): Promise<ServiceResult<any>> {
      const document = await baseModel.findByIdAndDelete(id);

      if (!document) {
        throw new ApiError("Document not found", "NOT_FOUND");
      }

      // Auto-delete translations if configured
      if (
        hasTranslation &&
        translationConfig?.autoDeleteTranslations !== false
      ) {
        const config = buildTranslationConfig();
        await TranslationManager.deleteAllTranslations(id, config);
      }

      const sanitizedDocument = sanitizeMongooseData(document);
      const language = await getLanguage(options);

      return {
        data: sanitizedDocument,
        _language: language,
      };
    },
  };

  // Add translation methods if translation is configured
  if (hasTranslation) {
    service.translation = {
      async create(
        id: string,
        translationData: TranslationCreateData
      ): Promise<any> {
        const config = buildTranslationConfig();
        return await TranslationManager.createTranslation(
          id,
          translationData,
          config
        );
      },

      async update(
        id: string,
        language: string,
        updateData: TranslationUpdateData
      ): Promise<any> {
        const config = buildTranslationConfig();
        return await TranslationManager.updateTranslation(
          id,
          language,
          updateData,
          config
        );
      },

      async delete(id: string, language: string): Promise<any> {
        const config = buildTranslationConfig();
        return await TranslationManager.deleteTranslation(id, language, config);
      },

      async getAll(id: string): Promise<any[]> {
        const config = buildTranslationConfig();
        return await TranslationManager.getTranslations(id, config);
      },

      async getOne(id: string, language: string): Promise<any | null> {
        const config = buildTranslationConfig();
        return await TranslationManager.getTranslation(id, language, config);
      },

      async upsert(
        id: string,
        translationData: TranslationCreateData
      ): Promise<TranslationResult> {
        const config = buildTranslationConfig();
        return await TranslationManager.upsertTranslation(
          id,
          translationData,
          config
        );
      },

      async getAvailableLanguages(id: string): Promise<string[]> {
        const config = buildTranslationConfig();
        return await TranslationManager.getAvailableLanguages(id, config);
      },

      async exists(id: string, language: string): Promise<boolean> {
        const config = buildTranslationConfig();
        return await TranslationManager.translationExists(id, language, config);
      },
    };
  }

  return service;
}

export default createBaseService;
