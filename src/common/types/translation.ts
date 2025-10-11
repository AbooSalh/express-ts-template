/**
 * @fileoverview Type definitions for the Translation Management System
 * @author Paradise Sharm Tours Development Team
 * @version 1.0.0
 */

import { Model, Document } from "mongoose";

/**
 * Language code type for the application
 * Based on ISO 639-1 standard (2-letter lowercase codes)
 * Actual supported lan  getAvailableLanguages(
    baseDocumentId: string,
    config: ResolvedTranslationConfig
  ): Promise<LanguageCode[]>;es are determined dynamically from the Language model
 * Examples: "en", "ar", "fr", "de", "es", "it", "ru"
 */
export type LanguageCode = string;

/**
 * Configuration options for translation management
 * Used to configure how translations are handled for a specific model
 */
export interface TranslationManagementConfig {
  /** Enable translation management features */
  enabled: boolean;

  /**
   * @deprecated No longer needed - required fields are automatically detected from the Mongoose schema
   * Fields that are required when creating translations
   * @example ['title', 'description']
   */
  requiredFields?: string[];

  /**
   * List of allowed language codes (if not specified, all supported languages are allowed)
   * @example ['en', 'ar', 'fr']
   */
  allowedLanguages?: LanguageCode[];

  /**
   * Automatically delete all translations when base document is deleted
   * @default true
   */
  autoDeleteTranslations?: boolean;
}

/**
 * Configuration for localization features
 * Used to configure how base models are merged with translations
 */
export interface LocalizationConfig {
  /** Enable localization support */
  enabled: boolean;

  /** Translation model to merge with base model */
  model: Model<any>;

  /**
   * Field name in translation model that references base model
   * @default lowercase model name (e.g., 'category' for Category model)
   */
  foreignKey?: string;

  /**
   * Field name in translation model that contains language code
   * @default 'language'
   */
  languageField?: string;

  /**
   * Default fallback language when translation not found
   * @default 'en'
   */
  fallbackLanguage?: LanguageCode;

  /**
   * Query parameter name for language selection
   * @default 'lang'
   */
  languageParam?: string;

  /**
   * Header name for language selection
   * @default 'Accept-Language'
   */
  languageHeader?: string;
}

/**
 * Internal configuration used by TranslationManager
 * Includes all required fields with defaults applied
 */
export interface ResolvedTranslationConfig {
  /** Translation model instance */
  model: Model<any>;

  /** Foreign key field name */
  foreignKey: string;

  /** Language field name */
  languageField: string;

  /** Fallback language code */
  fallbackLanguage: LanguageCode;

  /** Required fields for validation (optional) */
  requiredFields?: string[];

  /** Allowed languages for validation (optional) */
  allowedLanguages?: LanguageCode[];
}

/**
 * Base interface for translation data
 * Represents the data structure of a translation document
 */
export interface TranslationData {
  /** Dynamic fields based on translation model schema */
  [key: string]: any;
}

/**
 * Data structure for creating a new translation
 * Extends TranslationData with required language field
 */
export interface TranslationCreateData extends TranslationData {
  /** Language code for the translation */
  language: LanguageCode;
}

/**
 * Data structure for updating an existing translation
 * All fields are optional except language is read-only during updates
 */
export interface TranslationUpdateData extends Partial<TranslationData> {
  /** Language field is read-only during updates */
  language?: never;
}

/**
 * Response structure for translation operations
 * Standard format returned by translation management endpoints
 */
export interface TranslationResponse {
  /** MongoDB document ID */
  _id: string;

  /** Language code */
  language: LanguageCode;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;

  /** Additional fields based on translation model */
  [key: string]: any;
}

/**
 * Response structure for bulk translation operations
 */
export interface BulkTranslationResponse {
  /** Array of created/updated translations */
  translations: TranslationResponse[];

  /** Number of successful operations */
  successCount: number;

  /** Array of failed operations with errors */
  errors?: Array<{
    language: LanguageCode;
    error: string;
  }>;
}

/**
 * Response structure for upsert operations
 * Indicates whether translation was created or updated
 */
export interface UpsertTranslationResult {
  /** The translation document */
  translation: TranslationResponse;

  /** True if translation was created, false if updated */
  created: boolean;
}

/**
 * Language availability information
 */
export interface LanguageAvailability {
  /** Available language codes for a document */
  languages: LanguageCode[];

  /** Default/fallback language */
  defaultLanguage: LanguageCode;

  /** Total number of translations */
  count: number;
}

/**
 * Translation validation error details
 */
export interface TranslationValidationError {
  /** Field that failed validation */
  field: string;

  /** Provided value */
  value: any;

  /** Error message */
  message: string;

  /** Error code for programmatic handling */
  code: "REQUIRED" | "INVALID_LANGUAGE" | "DUPLICATE" | "INVALID_TYPE";
}

/**
 * Options for bulk translation operations
 */
export interface BulkTranslationOptions {
  /** Continue processing remaining translations if one fails */
  continueOnError?: boolean;

  /** Validate all translations before processing any */
  validateFirst?: boolean;

  /** Return detailed error information */
  includeErrors?: boolean;
}

/**
 * Translation statistics for analytics
 */
export interface TranslationStats {
  /** Total number of base documents */
  totalDocuments: number;

  /** Number of documents with at least one translation */
  translatedDocuments: number;

  /** Translation coverage percentage */
  coveragePercentage: number;

  /** Translation count by language */
  languageStats: Record<LanguageCode, number>;

  /** Most translated language */
  mostTranslatedLanguage: LanguageCode;

  /** Least translated language */
  leastTranslatedLanguage: LanguageCode;
}

/**
 * Configuration for translation import/export operations
 */
export interface TranslationImportExportConfig {
  /** Format for import/export (JSON, CSV, etc.) */
  format: "json" | "csv" | "xlsx";

  /** Include metadata in export */
  includeMetadata?: boolean;

  /** Languages to include in export */
  languages?: LanguageCode[];

  /** Base document fields to include */
  includeBaseFields?: string[];
}

/**
 * Localized document structure
 * Represents a document with merged translation data
 */
export interface LocalizedDocument extends Document {
  /** Language code of the applied translation */
  _language: LanguageCode;

  /** Whether fallback language was used */
  _isFallback: boolean;

  /** Available languages for this document */
  _availableLanguages?: LanguageCode[];

  /** Dynamic fields from base and translation models */
  [key: string]: any;
}

/**
 * Translation management service interface
 * Defines the contract for translation management operations
 */
export interface ITranslationManager {
  createTranslation(
    baseDocumentId: string,
    translationData: TranslationCreateData,
    config: ResolvedTranslationConfig
  ): Promise<TranslationResponse>;

  updateTranslation(
    baseDocumentId: string,
    language: LanguageCode,
    updateData: TranslationUpdateData,
    config: ResolvedTranslationConfig
  ): Promise<TranslationResponse>;

  deleteTranslation(
    baseDocumentId: string,
    language: LanguageCode,
    config: ResolvedTranslationConfig
  ): Promise<TranslationResponse>;

  getTranslations(
    baseDocumentId: string,
    config: ResolvedTranslationConfig
  ): Promise<TranslationResponse[]>;

  getTranslation(
    baseDocumentId: string,
    language: LanguageCode,
    config: ResolvedTranslationConfig
  ): Promise<TranslationResponse | null>;

  upsertTranslation(
    baseDocumentId: string,
    translationData: TranslationCreateData,
    config: ResolvedTranslationConfig
  ): Promise<UpsertTranslationResult>;

  getAvailableLanguages(
    baseDocumentId: string,
    config: ResolvedTranslationConfig
  ): Promise<LanguageCode[]>;

  deleteAllTranslations(
    baseDocumentId: string,
    config: ResolvedTranslationConfig
  ): Promise<{ deletedCount: number }>;
}

/**
 * Localization service interface
 * Defines the contract for localization operations
 */
export interface ILocalizationService {
  getLocalizedDocument(
    baseDoc: any,
    config: ResolvedTranslationConfig,
    language: LanguageCode
  ): Promise<LocalizedDocument>;

  getLocalizedDocuments(
    baseDocs: any[],
    config: ResolvedTranslationConfig,
    language: LanguageCode
  ): Promise<LocalizedDocument[]>;

  getLanguageFromRequest(
    req: any,
    languageParam?: string,
    languageHeader?: string
  ): LanguageCode;

  determineForeignKey(model: Model<any>): string;
}
