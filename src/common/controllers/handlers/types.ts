/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { Model } from "mongoose";
import { ValidationChain } from "express-validator";

/**
 * Hook function for processing data at various stages of the request/response cycle.
 * @param data - The data being processed (document, collection, or response object)
 * @param req - Express request object
 * @param res - Express response object
 * @returns The processed data or a Promise resolving to processed data
 */
export type ProcessingHook = (
  data: any,
  req: Request,
  res: Response
) => Promise<any>;

/**
 * Hook function for modifying database queries before or after execution.
 * @param query - The query object or query results
 * @param req - Express request object
 * @returns The modified query/results or a Promise resolving to modified query/results
 */
export type QueryHook = (query: any, req: Request) => Promise<any>;

/**
 * Standard Express middleware function type for request processing.
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @returns void or Promise<void>
 */
export type MiddlewareHook = (
  req: Request,
  res: Response,
  next: any
) => void | Promise<void>;

/**
 * Configuration interface for BaseController with comprehensive customization hooks.
 * Provides declarative way to customize all aspects of CRUD operations.
 */
export interface BaseControllerConfig {
  /** The Mongoose model to perform CRUD operations on */
  model: Model<any>;

  /**
   * Field visibility configuration by user role.
   * Fields listed for a role will be hidden from API responses for users with that role.
   * @example
   * ```typescript
   * hiddenFields: {
   *   public: ["views", "clicks", "adminNotes"],
   *   user: ["adminNotes"],
   *   admin: [] // admins see everything
   * }
   * ```
   */
  hiddenFields?: {
    [role: string]: string[];
  };

  /**
   * Custom field processors for computed fields that don't exist in the database.
   * Each processor function receives the document and request, and returns the computed value.
   * @example
   * ```typescript
   * processors: {
   *   fullName: (doc, req) => `${doc.firstName} ${doc.lastName}`,
   *   activeOffer: (doc, req) => {
   *     const country = req.headers["x-country"] || "EN";
   *     return doc.offers.find(o => o.countries.includes(country));
   *   }
   * }
   * ```
   */
  processors?: {
    [fieldName: string]: (doc: any, req: Request) => any;
  };

  /**
   * Custom sorting handlers for computed fields that can't be sorted at database level.
   * @example
   * ```typescript
   * customSorts: {
   *   "activeOffer.price": (docs, isDescending, req) => {
   *     return docs.sort((a, b) => {
   *       const priceA = a.activeOffer?.price || 0;
   *       const priceB = b.activeOffer?.price || 0;
   *       return isDescending ? priceB - priceA : priceA - priceB;
   *     });
   *   }
   * }
   * ```
   */
  customSorts?: {
    [sortField: string]: (
      docs: any[],
      isDescending: boolean,
      req: Request
    ) => any[];
  };

  /**
   * Express middleware functions to run before specific operations.
   * Useful for authentication, logging, validation, etc.
   * @example
   * ```typescript
   * middleware: {
   *   beforeGetOne: [authMiddleware, logViewMiddleware],
   *   beforeCreate: [validateCategoryMiddleware],
   *   beforeUpdate: [ownershipCheckMiddleware]
   * }
   * ```
   */
  middleware?: {
    beforeGetOne?: MiddlewareHook[];
    beforeGetAll?: MiddlewareHook[];
    beforeCreate?: MiddlewareHook[];
    beforeUpdate?: MiddlewareHook[];
    beforeDelete?: MiddlewareHook[];
  };

  /**
   * Hooks for customizing database queries before and after execution.
   * @example
   * ```typescript
   * queryHooks: {
   *   beforeQuery: async (query, req) => {
   *     // Auto-filter published content for non-admins
   *     if (req.user?.role !== "admin") {
   *       query.isPublished = "true";
   *     }
   *     return query;
   *   },
   *   afterQuery: async (results, req) => {
   *     // Add computed statistics
   *     results.forEach(doc => {
   *       doc.popularityScore = doc.views * 0.7 + doc.clicks * 0.3;
   *     });
   *     return results;
   *   }
   * }
   * ```
   */
  queryHooks?: {
    /** Modify query parameters before database execution */
    beforeQuery?: QueryHook;
    /** Modify query results after database execution */
    afterQuery?: QueryHook;
  };

  /**
   * Data processing hooks for customizing documents and responses at various stages.
   * @example
   * ```typescript
   * dataHooks: {
   *   beforeProcessDocument: async (doc, req, res) => {
   *     doc.processedAt = new Date();
   *     return doc;
   *   },
   *   afterProcessDocument: async (doc, req, res) => {
   *     if (req.user) {
   *       doc.isBookmarked = await checkUserBookmark(req.user.id, doc.id);
   *     }
   *     return doc;
   *   },
   *   beforeResponse: async (data, req, res) => {
   *     return {
   *       ...data,
   *       meta: {
   *         timestamp: new Date(),
   *         requestId: req.headers["x-request-id"]
   *       }
   *     };
   *   }
   * }
   * ```
   */
  dataHooks?: {
    /** Process individual documents before field processors and hiding */
    beforeProcessDocument?: ProcessingHook;
    /** Process individual documents after all processing */
    afterProcessDocument?: ProcessingHook;

    /** Process final response object before sending to client */
    beforeResponse?: ProcessingHook;
    /** Final processing after all transformations (useful for logging) */
    afterResponse?: ProcessingHook;

    /** Process document collections before individual document processing */
    beforeProcessCollection?: ProcessingHook;
    /** Process document collections after individual document processing */
    afterProcessCollection?: ProcessingHook;
  };

  /**
   * Request and response transformation functions.
   * @example
   * ```typescript
   * transforms: {
   *   requestTransform: (data, req) => {
   *     // Auto-set timestamps
   *     if (req.method === "POST") data.createdAt = new Date();
   *     if (req.method === "PUT") data.updatedAt = new Date();
   *     return data;
   *   },
   *   responseTransform: (data, req, res) => {
   *     // Add API version
   *     if (typeof data === 'object') data.apiVersion = "v1.0";
   *     return data;
   *   }
   * }
   * ```
   */
  transforms?: {
    /** Transform request data before database operations */
    requestTransform?: (data: any, req: Request) => any;

    /** Transform response data before sending to client */
    responseTransform?: (data: any, req: Request, res: Response) => any;
  };

  /**
   * Configuration for automatic schema-based validation.
   * @example
   * ```typescript
   * validation: {
   *   enabled: true,
   *   exclude: ["specialField"] // Exclude 'specialField' from validation
   * }
   * ```
   */
  validation?: {
    /**
     * Enable automatic validation based on the Mongoose schema.
     * Defaults to false.
     */
    enabled: boolean;
    /**
     * Fields to exclude from automatic validation.
     */
    exclude?: string[];
    /**
     * Custom validation chains to run for create and update operations.
     * To override a schema-based validator, first add the field to the `exclude` array,
     * then provide your custom validator chain here.
     * @example
     * ```typescript
     * import { body } from 'express-validator';
     *
     * custom: {
     *   create: [
     *     body('email').isEmail().withMessage('A valid email is required'),
     *     body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
     *   ],
     *   update: [
     *     body('email').optional().isEmail().withMessage('A valid email is required')
     *   ]
     * }
     * ```
     */
    custom?: {
      create?: ValidationChain[];
      update?: ValidationChain[];
    };
  };

  /**
   * Localization configuration for multilingual content support.
   * When enabled, automatically merges base model with translation model based on language parameter.
   * @example
   * ```typescript
   * localization: {
   *   enabled: true,
   *   model: CategoryLocalized,
   *   foreignKey: 'category',
   *   languageField: 'language',
   *   fallbackLanguage: 'en',
   *   languageParam: 'lang',
   *   languageHeader: 'Accept-Language'
   * }
   * ```
   */
  localization?: {
    /** Enable localization support */
    enabled: boolean;
    /** Translation model to merge with base model */
    model: Model<any>;
    /** Field name in translation model that references base model (default: lowercase model name) */
    foreignKey?: string;
    /** Field name in translation model that contains language code (default: 'language') */
    languageField?: string;
    /** Default fallback language when translation not found (default: 'en') */
    fallbackLanguage?: string;
    /** Query parameter name for language selection (default: 'lang') */
    languageParam?: string;
    /** Header name for language selection (default: 'Accept-Language') */
    languageHeader?: string;
  };

  /**
   * Translation management configuration for handling CRUD operations on translation models.
   * When enabled, provides additional endpoints and methods for managing translations.
   * @example
   * ```typescript
   * translationManagement: {
   *   enabled: true,
   *   requiredFields: ['title', 'description'],
   *   allowedLanguages: ['en', 'ar', 'fr', 'de'],
   *   autoDeleteTranslations: true
   * }
   * ```
   */
  translationManagement?: {
    /** Enable translation management features */
    enabled: boolean;
    /** Fields that are required when creating translations */
    requiredFields?: string[];
    /** List of allowed language codes (if not specified, all languages allowed) */
    allowedLanguages?: string[];
    /** Automatically delete all translations when base document is deleted (default: true) */
    autoDeleteTranslations?: boolean;
  };

  /**
   * Search configuration for customizing which fields are searchable.
   * @example
   * ```typescript
   * search: {
   *   fields: ['title', 'description', 'name'], // Default searchable fields
   *   allowDynamicFields: true, // Allow ?searchFields=title,description in query
   *   caseSensitive: false // Case-insensitive search (default)
   * }
   * ```
   */
  search?: {
    /**
     * Default fields to search in.
     * For backward compatibility, this applies to:
     *  - localized search fields when localization is enabled
     *  - base model search fields when localization is disabled
     */
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
  };
}
