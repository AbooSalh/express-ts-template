/**
 * @fileoverview Translation Management Service
 * @description Provides comprehensive CRUD operations for translation models with validation,
 * language restrictions, and automatic cleanup features.
 * @author Paradise Sharm Tours Development Team
 * @version 1.0.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model } from "mongoose";
import { sanitizeMongooseData } from "@/common/utils/sanitizeData";
import { extractRequiredFields } from "@/common/utils/validatorsGenerator";
import { languageService } from "./languageService";
import ApiError from "@/common/utils/api/ApiError";

/**
 * Configuration interface for TranslationManager operations
 * Defines how translations should be handled for a specific model
 */
export interface TranslationConfig {
  /** Mongoose model for the translation collection */
  model: Model<any>;
  /** Foreign key field name that references the base document */
  foreignKey: string;
  /** Field name that contains the language code */
  languageField: string;
  /** Default fallback language code */
  fallbackLanguage: string;
  /**
   * @deprecated No longer needed - required fields are automatically detected from the Mongoose schema
   * Optional array of required field names for validation
   */
  requiredFields?: string[];
  /** Optional array of allowed language codes */
  allowedLanguages?: string[];
}

/**
 * Base interface for translation document data
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
  language: string;
}

/**
 * Data structure for updating an existing translation
 * All fields are optional, language is read-only during updates
 */
export interface TranslationUpdateData extends Partial<TranslationData> {
  /** Language field (read-only during updates) */
  language?: string;
}

/**
 * TranslationManager - Comprehensive Translation Management Service
 *
 * @description Provides a clean, type-safe API for managing translations alongside base documents.
 * Handles validation, language restrictions, duplicate prevention, and automatic cleanup.
 *
 * @example
 * ```typescript
 * const config: TranslationConfig = {
 *   model: CategoryLocalized,
 *   foreignKey: 'category',
 *   languageField: 'language',
 *   fallbackLanguage: 'en',
 *   allowedLanguages: ['en', 'ar', 'fr', 'de']
 * };
 * // Note: Required fields are now automatically detected from the Mongoose schema
 *
 * // Create a new translation
 * const translation = await TranslationManager.createTranslation(
 *   categoryId,
 *   { language: 'ar', title: 'عنوان', description: 'وصف' },
 *   config
 * );
 * ```
 *
 * @author Paradise Sharm Tours Development Team
 * @version 1.0.0
 * @since 1.0.0
 */
export class TranslationManager {
  /**
   * Creates a new translation for an existing base document
   *
   * @description This method validates the provided translation data, checks for duplicates,
   * and creates a new translation document. It performs the following validations:
   * - Language code validation against allowedLanguages (if specified)
   * - Required fields validation
   * - Duplicate language check for the same base document
   *
   * @param baseDocumentId - The ID of the base document to translate
   * @param translationData - The translation data including language and content fields
   * @param config - Translation configuration object
   *
   * @returns Promise resolving to the sanitized translation document
   *
   * @throws {ApiError} BAD_REQUEST - When language is not allowed or required fields are missing
   * @throws {ApiError} CONFLICT - When translation already exists for the specified language
   *
   * @example
   * ```typescript
   * const translation = await TranslationManager.createTranslation(
   *   '507f1f77bcf86cd799439011',
   *   {
   *     language: 'ar',
   *     title: 'منتج رائع',
   *     description: 'وصف تفصيلي للمنتج'
   *   },
   *   config
   * );
   * ```
   *
   * @since 1.0.0
   */
  static async createTranslation(
    baseDocumentId: string,
    translationData: TranslationCreateData,
    config: TranslationConfig
  ): Promise<any> {
    const { model, foreignKey, languageField, allowedLanguages } = config;

    // Validate language using dynamic language service
    const languageValidation = await languageService.validateLanguageCode(
      translationData.language
    );
    if (!languageValidation.valid) {
      throw new ApiError(languageValidation.error!, "BAD_REQUEST");
    }

    // Additional validation if specific allowedLanguages are configured
    if (
      allowedLanguages &&
      !allowedLanguages.includes(translationData.language)
    ) {
      throw new ApiError(
        `Language "${
          translationData.language
        }" is not allowed for this module. Allowed languages: ${allowedLanguages.join(
          ", "
        )}`,
        "BAD_REQUEST"
      );
    }

    // Validate required fields automatically from schema
    const schemaRequiredFields = extractRequiredFields(model);
    // Exclude system fields that are handled automatically
    const fieldsToValidate = schemaRequiredFields.filter(
      (field) =>
        field !== foreignKey &&
        field !== languageField &&
        field !== "_id" &&
        field !== "createdAt" &&
        field !== "updatedAt"
    );

    if (fieldsToValidate.length > 0) {
      const missingFields = fieldsToValidate.filter(
        (field) =>
          !translationData[field] ||
          (typeof translationData[field] === "string" &&
            translationData[field].trim() === "")
      );
      if (missingFields.length > 0) {
        throw new ApiError(
          `Missing required fields: ${missingFields.join(", ")}`,
          "BAD_REQUEST"
        );
      }
    }

    // Check if translation already exists for this language
    const existingTranslation = await model.findOne({
      [foreignKey]: baseDocumentId,
      [languageField]: translationData.language,
    });

    if (existingTranslation) {
      throw new ApiError(
        `Translation for language "${translationData.language}" already exists`,
        "CONFLICT"
      );
    }

    // Create the translation
    const translation = await model.create({
      [foreignKey]: baseDocumentId,
      [languageField]: translationData.language,
      ...translationData,
    });

    return sanitizeMongooseData(translation);
  }

  /**
   * Updates an existing translation document
   *
   * @description Updates the content of an existing translation without modifying the language code.
   * The language field is automatically excluded from updates to prevent accidental changes.
   *
   * @param baseDocumentId - The ID of the base document
   * @param language - The language code of the translation to update
   * @param updateData - Partial data to update (language field will be ignored)
   * @param config - Translation configuration object
   *
   * @returns Promise resolving to the updated translation document
   *
   * @throws {ApiError} BAD_REQUEST - When language is not allowed
   * @throws {ApiError} NOT_FOUND - When translation doesn't exist for the specified language
   *
   * @example
   * ```typescript
   * const updatedTranslation = await TranslationManager.updateTranslation(
   *   '507f1f77bcf86cd799439011',
   *   'ar',
   *   { title: 'عنوان محدث', description: 'وصف محدث' },
   *   config
   * );
   * ```
   *
   * @since 1.0.0
   */
  static async updateTranslation(
    baseDocumentId: string,
    language: string,
    updateData: TranslationUpdateData,
    config: TranslationConfig
  ): Promise<any> {
    const { model, foreignKey, languageField, allowedLanguages } = config;

    // Validate language using dynamic language service
    const languageValidation = await languageService.validateLanguageCode(
      language
    );
    if (!languageValidation.valid) {
      throw new ApiError(languageValidation.error!, "BAD_REQUEST");
    }

    // Additional validation if specific allowedLanguages are configured
    if (allowedLanguages && !allowedLanguages.includes(language)) {
      throw new ApiError(
        `Language "${language}" is not allowed for this module. Allowed languages: ${allowedLanguages.join(
          ", "
        )}`,
        "BAD_REQUEST"
      );
    }

    // Remove language from updateData to prevent accidental changes
    const { language: _, ...safeUpdateData } = updateData;

    const translation = await model.findOneAndUpdate(
      {
        [foreignKey]: baseDocumentId,
        [languageField]: language,
      },
      { $set: safeUpdateData },
      { new: true, runValidators: true }
    );

    if (!translation) {
      throw new ApiError(
        `Translation for language "${language}" not found`,
        "NOT_FOUND"
      );
    }

    return sanitizeMongooseData(translation);
  }

  /**
   * Deletes a translation for a specific language
   *
   * @description Removes a translation document from the database. Includes safety checks
   * to prevent deletion of the fallback language when it's the only remaining translation.
   *
   * @param baseDocumentId - The ID of the base document
   * @param language - The language code of the translation to delete
   * @param config - Translation configuration object
   *
   * @returns Promise resolving to the deleted translation document
   *
   * @throws {ApiError} BAD_REQUEST - When attempting to delete the only remaining translation (fallback language)
   * @throws {ApiError} NOT_FOUND - When translation doesn't exist for the specified language
   *
   * @example
   * ```typescript
   * const deletedTranslation = await TranslationManager.deleteTranslation(
   *   '507f1f77bcf86cd799439011',
   *   'ar',
   *   config
   * );
   * ```
   *
   * @since 1.0.0
   */
  static async deleteTranslation(
    baseDocumentId: string,
    language: string,
    config: TranslationConfig
  ): Promise<any> {
    const { model, foreignKey, languageField, fallbackLanguage } = config;

    // Prevent deletion of fallback language if it's the only translation
    if (language === fallbackLanguage) {
      const translationCount = await model.countDocuments({
        [foreignKey]: baseDocumentId,
      });

      if (translationCount === 1) {
        throw new ApiError(
          `Cannot delete the only translation (fallback language: ${fallbackLanguage})`,
          "BAD_REQUEST"
        );
      }
    }

    const translation = await model.findOneAndDelete({
      [foreignKey]: baseDocumentId,
      [languageField]: language,
    });

    if (!translation) {
      throw new ApiError(
        `Translation for language "${language}" not found`,
        "NOT_FOUND"
      );
    }

    return sanitizeMongooseData(translation);
  }

  /**
   * Get all translations for a base document
   */
  static async getTranslations(
    baseDocumentId: string,
    config: TranslationConfig
  ): Promise<any[]> {
    const { model, foreignKey } = config;

    const translations = await model
      .find({
        [foreignKey]: baseDocumentId,
      })
      .lean();

    return translations.map((translation) => sanitizeMongooseData(translation));
  }

  /**
   * Get a specific translation by language
   */
  static async getTranslation(
    baseDocumentId: string,
    language: string,
    config: TranslationConfig
  ): Promise<any | null> {
    const { model, foreignKey, languageField } = config;

    const translation = await model
      .findOne({
        [foreignKey]: baseDocumentId,
        [languageField]: language,
      })
      .lean();

    return translation ? sanitizeMongooseData(translation) : null;
  }

  /**
   * Delete all translations for a base document (used when base document is deleted)
   */
  static async deleteAllTranslations(
    baseDocumentId: string,
    config: TranslationConfig
  ): Promise<{ deletedCount: number }> {
    const { model, foreignKey } = config;

    const result = await model.deleteMany({
      [foreignKey]: baseDocumentId,
    });

    return { deletedCount: result.deletedCount || 0 };
  }

  /**
   * Create multiple translations at once
   */
  static async createMultipleTranslations(
    baseDocumentId: string,
    translations: TranslationCreateData[],
    config: TranslationConfig
  ): Promise<any[]> {
    const { model, foreignKey, languageField, allowedLanguages } = config;

    // Validate all languages using dynamic language service
    const invalidLanguages: string[] = [];
    const invalidReasons: string[] = [];

    for (const translation of translations) {
      const languageValidation = await languageService.validateLanguageCode(
        translation.language
      );
      if (!languageValidation.valid) {
        invalidLanguages.push(translation.language);
        invalidReasons.push(languageValidation.error!);
      }
    }

    if (invalidLanguages.length > 0) {
      throw new ApiError(
        `Invalid languages: ${invalidLanguages.join(
          ", "
        )}. Errors: ${invalidReasons.join("; ")}`,
        "BAD_REQUEST"
      );
    }

    // Additional validation if specific allowedLanguages are configured
    if (allowedLanguages) {
      const restrictedLanguages = translations
        .map((t) => t.language)
        .filter((lang) => !allowedLanguages.includes(lang));

      if (restrictedLanguages.length > 0) {
        throw new ApiError(
          `Languages not allowed for this module: ${restrictedLanguages.join(
            ", "
          )}. Allowed: ${allowedLanguages.join(", ")}`,
          "BAD_REQUEST"
        );
      }
    }

    // Check for duplicate languages in the request
    const languages = translations.map((t) => t.language);
    const duplicates = languages.filter(
      (lang, index) => languages.indexOf(lang) !== index
    );
    if (duplicates.length > 0) {
      throw new ApiError(
        `Duplicate languages in request: ${duplicates.join(", ")}`,
        "BAD_REQUEST"
      );
    }

    // Check for existing translations
    const existingTranslations = await model.find({
      [foreignKey]: baseDocumentId,
      [languageField]: { $in: languages },
    });

    if (existingTranslations.length > 0) {
      const existingLanguages = existingTranslations.map(
        (t) => t[languageField]
      );
      throw new ApiError(
        `Translations already exist for languages: ${existingLanguages.join(
          ", "
        )}`,
        "CONFLICT"
      );
    }

    // Create all translations
    const translationDocs = translations.map((translation) => ({
      [foreignKey]: baseDocumentId,
      [languageField]: translation.language,
      ...translation,
    }));

    const createdTranslations = await model.insertMany(translationDocs, {
      ordered: false,
    });

    return createdTranslations.map((translation) =>
      sanitizeMongooseData(translation)
    );
  }

  /**
   * Get available languages for a base document
   */
  static async getAvailableLanguages(
    baseDocumentId: string,
    config: TranslationConfig
  ): Promise<string[]> {
    const { model, foreignKey, languageField } = config;

    const translations = await model
      .find({
        [foreignKey]: baseDocumentId,
      })
      .select(languageField)
      .lean();

    return translations.map((t) => t[languageField]);
  }

  /**
   * Check if a translation exists for a specific language
   */
  static async translationExists(
    baseDocumentId: string,
    language: string,
    config: TranslationConfig
  ): Promise<boolean> {
    const { model, foreignKey, languageField } = config;

    const count = await model.countDocuments({
      [foreignKey]: baseDocumentId,
      [languageField]: language,
    });

    return count > 0;
  }

  /**
   * Update or create translation (upsert)
   */
  static async upsertTranslation(
    baseDocumentId: string,
    translationData: TranslationCreateData,
    config: TranslationConfig
  ): Promise<{ translation: any; created: boolean }> {
    const { model, foreignKey, languageField } = config;

    const filter = {
      [foreignKey]: baseDocumentId,
      [languageField]: translationData.language,
    };

    const updateData = {
      [foreignKey]: baseDocumentId,
      [languageField]: translationData.language,
      ...translationData,
    };

    const translation = await model.findOneAndUpdate(
      filter,
      { $set: updateData },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    // Check if it was created or updated
    const wasCreated =
      translation.isNew ||
      !(await model.exists({
        ...filter,
        _id: { $ne: translation._id },
      }));

    return {
      translation: sanitizeMongooseData(translation),
      created: wasCreated,
    };
  }
}

export default TranslationManager;
