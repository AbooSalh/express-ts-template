/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import { Model } from "mongoose";
import { sanitizeMongooseData } from "@/common/utils/sanitizeData";

/**
 * Localization configuration for the service
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
 * Service for handling localization logic
 * Merges base model data with translation data based on language preference
 */
export class LocalizationService {
  /**
   * Get language preference from request
   * Checks query parameter first, then Accept-Language header
   */
  static getLanguageFromRequest(
    req: any,
    languageParam: string = "lang",
    languageHeader: string = "Accept-Language"
  ): string {
    // Check query parameter first
    const queryLang = req.query[languageParam];
    if (queryLang && typeof queryLang === "string") {
      return queryLang.toLowerCase();
    }

    // Check Accept-Language header
    const headerLang = req.headers[languageHeader.toLowerCase()];
    if (headerLang && typeof headerLang === "string") {
      // Parse Accept-Language header (e.g., "en-US,en;q=0.9,ar;q=0.8")
      const preferredLang = headerLang.split(",")[0].split("-")[0];
      return preferredLang.toLowerCase();
    }

    return "en"; // Default fallback
  }

  /**
   * Merge base document with translation data
   * Returns base data merged with translation for requested language
   */
  static async getLocalizedDocument(
    baseDoc: any,
    config: LocalizationConfig,
    language: string
  ): Promise<any> {
    if (!baseDoc) return null;

    const baseData = sanitizeMongooseData(baseDoc);

    // Try to get translation for requested language
    let translation = await config.model
      .findOne({
        [config.foreignKey]: baseDoc._id,
        [config.languageField]: language,
      });

    // If no translation found, try fallback language
    if (!translation && language !== config.fallbackLanguage) {
      translation = await config.model
        .findOne({
          [config.foreignKey]: baseDoc._id,
          [config.languageField]: config.fallbackLanguage,
        });
    }

    // If still no translation found, try ANY available language
    if (!translation) {
      translation = await config.model
        .findOne({
          [config.foreignKey]: baseDoc._id,
        });
    }

    if (translation) {
      const translationData = sanitizeMongooseData(translation);
      // Remove the foreign key reference and language field from translation data
      delete translationData[config.foreignKey];
      delete translationData[config.languageField];
      delete translationData._id;
      delete translationData.__v;
      delete translationData.createdAt;
      delete translationData.updatedAt;

      return {
        ...baseData,
        localized: {
          ...translationData,
          language: (translation as any)[config.languageField],
        },
      };
    }

    // Return base data if no translation found at all
    return {
      ...baseData,
      localized: null,
    };
  }

  /**
   * Merge multiple base documents with their translations
   * Efficiently handles bulk localization
   */
  static async getLocalizedDocuments(
    baseDocs: any[],
    config: LocalizationConfig,
    language: string
  ): Promise<any[]> {
    if (!baseDocs || baseDocs.length === 0) return [];

    const baseIds = baseDocs.map((doc) => doc._id);

    // Get all translations for requested language
    const requestedTranslations = await config.model
      .find({
        [config.foreignKey]: { $in: baseIds },
        [config.languageField]: language,
      });

    // Get fallback translations if needed
    let fallbackTranslations: any[] = [];
    if (language !== config.fallbackLanguage) {
      fallbackTranslations = await config.model
        .find({
          [config.foreignKey]: { $in: baseIds },
          [config.languageField]: config.fallbackLanguage,
        });
    }

    // Get ANY available translations for documents that still don't have translations
    const allTranslations = await config.model
      .find({
        [config.foreignKey]: { $in: baseIds },
      });

    // Create translation maps for efficient lookup
    const requestedTranslationMap = new Map(
      requestedTranslations.map((t) => [t[config.foreignKey].toString(), t])
    );
    const fallbackTranslationMap = new Map(
      fallbackTranslations.map((t) => [t[config.foreignKey].toString(), t])
    );
    
    // Create a map for any available translation (grouped by foreign key)
    const anyTranslationMap = new Map();
    allTranslations.forEach((t) => {
      const key = t[config.foreignKey].toString();
      if (!anyTranslationMap.has(key)) {
        anyTranslationMap.set(key, t);
      }
    });

    // Merge each base document with its translation
    return baseDocs.map((baseDoc) => {
      const baseData = sanitizeMongooseData(baseDoc);

      // Try requested language first, then fallback, then any available
      const translation =
        requestedTranslationMap.get(baseDoc._id.toString()) ??
        fallbackTranslationMap.get(baseDoc._id.toString()) ??
        anyTranslationMap.get(baseDoc._id.toString());

      if (translation) {
        const translationData = sanitizeMongooseData(translation);
        // Remove the foreign key reference and language field from translation data
        delete translationData[config.foreignKey];
        delete translationData[config.languageField];
        delete translationData._id;
        delete translationData.__v;
        delete translationData.createdAt;
        delete translationData.updatedAt;

        return {
          ...baseData,
          localized: {
            ...translationData,
            language: (translation as any)[config.languageField],
          },
        };
      }

      // Return base data if no translation found at all
      return {
        ...baseData,
        localized: null,
      };
    });
  }

  /**
   * Helper method to determine the foreign key field name
   * If not provided, uses the model name in lowercase
   */
  static determineForeignKey(
    baseModel: Model<any>,
    providedForeignKey?: string
  ): string {
    if (providedForeignKey) return providedForeignKey;

    // Get model name and convert to lowercase
    const modelName = baseModel.modelName.toLowerCase();
    return modelName;
  }
}

export default LocalizationService;
