/**
 * @fileoverview Language Service for dynamic language configuration
 * @author Paradise Sharm Tours Development Team
 * @version 1.0.0
 */

import Language from "@/common/modules/Language/model";
import { LanguageCode } from "@/common/types/translation";

/**
 * Language configuration interface
 */
export interface LanguageConfig {
  defaultLanguage: LanguageCode;
  supportedLanguages: LanguageCode[];
  isLanguageSupported: (code: string) => boolean;
}

/**
 * Service for managing language configuration dynamically
 */
class LanguageService {
  private cachedConfig: LanguageConfig | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get current language configuration with caching
   */
  async getLanguageConfig(): Promise<LanguageConfig> {
    const now = Date.now();

    // Return cached config if still valid
    if (this.cachedConfig && now < this.cacheExpiry) {
      return this.cachedConfig;
    }

    try {
      // Fetch all languages from database
      const languages = await Language.find({}).select("code isDefault").lean();

      if (!languages || languages.length === 0) {
        // Fallback to default configuration if no languages in DB
        return this.getDefaultConfig();
      }

      // Find default language
      const defaultLang = languages.find((lang) => lang.isDefault);
      const defaultLanguage: LanguageCode =
        (defaultLang?.code as LanguageCode) || "en";

      // Get all supported language codes
      const supportedLanguages: LanguageCode[] = languages.map(
        (lang) => lang.code as LanguageCode
      );

      // Ensure default language is in supported list
      if (!supportedLanguages.includes(defaultLanguage)) {
        supportedLanguages.push(defaultLanguage);
      }

      const config: LanguageConfig = {
        defaultLanguage,
        supportedLanguages,
        isLanguageSupported: (code: string) =>
          supportedLanguages.includes(code as LanguageCode),
      };

      // Cache the configuration
      this.cachedConfig = config;
      this.cacheExpiry = now + this.CACHE_DURATION;

      return config;
    } catch (error) {
      console.error("Error fetching language configuration:", error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default language code
   */
  async getDefaultLanguage(): Promise<LanguageCode> {
    const config = await this.getLanguageConfig();
    return config.defaultLanguage;
  }

  /**
   * Get array of supported language codes
   */
  async getSupportedLanguages(): Promise<LanguageCode[]> {
    const config = await this.getLanguageConfig();
    return config.supportedLanguages;
  }

  /**
   * Check if a language code is supported
   */
  async isLanguageSupported(code: string): Promise<boolean> {
    const config = await this.getLanguageConfig();
    return config.isLanguageSupported(code);
  }

  /**
   * Get fallback configuration when database is unavailable
   */
  private getDefaultConfig(): LanguageConfig {
    const defaultLanguage: LanguageCode = "en";
    const supportedLanguages: LanguageCode[] = [
      "en",
      "ar",
      "fr",
      "de",
      "es",
      "it",
      "ru",
    ];

    return {
      defaultLanguage,
      supportedLanguages,
      isLanguageSupported: (code: string) =>
        supportedLanguages.includes(code as LanguageCode),
    };
  }

  /**
   * Invalidate cache (useful when languages are updated)
   */
  invalidateCache(): void {
    this.cachedConfig = null;
    this.cacheExpiry = 0;
  }

  /**
   * Validate language code format and support
   */
  async validateLanguageCode(
    code: string
  ): Promise<{ valid: boolean; error?: string }> {
    // Check format (ISO 639-1: 2 lowercase letters)
    if (!/^[a-z]{2}$/.test(code)) {
      return {
        valid: false,
        error: `Invalid language code format: ${code}. Expected 2 lowercase letters (ISO 639-1)`,
      };
    }

    // Check if supported
    const isSupported = await this.isLanguageSupported(code);
    if (!isSupported) {
      const supportedLanguages = await this.getSupportedLanguages();
      return {
        valid: false,
        error: `Language code '${code}' is not supported. Supported languages: ${supportedLanguages.join(
          ", "
        )}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get language configuration for a specific base document
   * Useful for documents that might have custom language restrictions
   */
  async getDocumentLanguageConfig(
    documentId?: string
  ): Promise<LanguageConfig> {
    // For now, return global config
    // In the future, this could support document-specific language restrictions
    return this.getLanguageConfig();
  }
}

// Export singleton instance
export const languageService = new LanguageService();
export default languageService;
