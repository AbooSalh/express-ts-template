/**
 * @fileoverview Service Type Definitions
 * @description Comprehensive TypeScript interfaces and types for the unified service pattern
 * @author Paradise Sharm Tours Development Team
 * @version 1.0.0
 */

import { Model } from "mongoose";
import { Request } from "express";
import { IRequestQuery } from "@/common/utils/api/ApiFeatures";

/**
 * Base service configuration
 */
export interface BaseServiceConfig {
  /** The main Mongoose model */
  model: Model<any>;
  /** Optional translation configuration */
  translation?: ServiceTranslationConfig;
}

/**
 * Translation configuration for services
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
 * Translation management interface
 */
export interface TranslationService {
  /** Create a new translation */
  create: (id: string, translationData: any) => Promise<any>;

  /** Update an existing translation */
  update: (id: string, language: string, updateData: any) => Promise<any>;

  /** Delete a translation */
  delete: (id: string, language: string) => Promise<any>;

  /** Get all translations for a document */
  getAll: (id: string) => Promise<any[]>;

  /** Get a specific translation */
  getOne: (id: string, language: string) => Promise<any | null>;

  /** Create or update translation (upsert) */
  upsert: (id: string, translationData: any) => Promise<TranslationResult>;

  /** Get available languages for a document */
  getAvailableLanguages: (id: string) => Promise<string[]>;

  /** Check if translation exists */
  exists: (id: string, language: string) => Promise<boolean>;
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
  translation?: TranslationService;
}

/**
 * Service factory function type
 */
export type ServiceFactory = (
  baseModel: Model<any>,
  translationConfig?: ServiceTranslationConfig
) => BaseService;

/**
 * Language detection options
 */
export interface LanguageDetectionOptions {
  /** Query parameter name for language (defaults to 'lang') */
  languageParam?: string;
  /** Header name for language (defaults to 'Accept-Language') */
  languageHeader?: string;
  /** Default language if none detected */
  defaultLanguage?: string;
}

/**
 * Localization configuration
 */
export interface LocalizationConfig {
  /** Translation model to merge with base model */
  model: Model<any>;
  /** Field name in translation model that references base model */
  foreignKey: string;
  /** Field name in translation model that contains language code */
  languageField: string;
  /** Default fallback language when translation not found */
  fallbackLanguage: string;
}

/**
 * Translation data interfaces
 */
export interface TranslationData {
  /** Dynamic fields based on translation model schema */
  [key: string]: any;
}

export interface TranslationCreateData extends TranslationData {
  /** Language code for the translation */
  language: string;
}

export interface TranslationUpdateData extends Partial<TranslationData> {
  /** Language field (read-only during updates) */
  language?: string;
}

/**
 * Service error types
 */
export interface ServiceError {
  message: string;
  code: string;
  statusCode: number;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  /** Number of successful operations */
  successCount: number;
  /** Number of failed operations */
  errorCount: number;
  /** Array of errors */
  errors: ServiceError[];
  /** Array of successful results */
  results: any[];
}

/**
 * Service statistics
 */
export interface ServiceStats {
  /** Total number of documents */
  total: number;
  /** Number of documents with translations */
  withTranslations: number;
  /** Available languages and their counts */
  languageStats: Record<string, number>;
  /** Last updated timestamp */
  lastUpdated: Date;
}
