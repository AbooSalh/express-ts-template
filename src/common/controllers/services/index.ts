/**
 * @fileoverview Services Index
 * @description Unified service pattern exports and utilities
 * @author Paradise Sharm Tours Development Team
 * @version 1.0.0
 */

// Main service factory
export { createBaseService } from "./baseService";
export type {
  BaseService,
  ServiceTranslationConfig,
  ServiceOptions,
  ServiceResult,
  TranslationResult,
} from "./baseService";

// Translation management
export { default as TranslationManager } from "./translationManager";
export type {
  TranslationConfig,
  TranslationData,
  TranslationCreateData,
  TranslationUpdateData,
} from "./translationManager";

// Localization services
export { default as LocalizationService } from "./localizationService";
export type { LocalizationConfig } from "./localizationService";

// Language services
export { default as languageService } from "./languageService";
export type { LanguageConfig } from "./languageService";

// Type definitions
export type * from "@/common/types/service";
