/**
 * @fileoverview Reusable schema definitions for translation fields
 * @description Provides common field definitions that can be imported and used across all translation models
 * @author Paradise Sharm Tours Development Team
 * @version 1.0.0
 */

import { languageService } from "../controllers/services/languageService";

/**
 * Language field definition with dynamic validation
 * Can be imported and used in any translation schema
 */
export const languageField = {
  type: String,
  required: true,
  validate: {
    validator: async function (value: string) {
      try {
        const validation = await languageService.validateLanguageCode(value);
        return validation.valid;
      } catch (error) {
        // Fallback validation if service is unavailable
        console.warn(
          "Language service unavailable, using fallback validation:",
          error
        );
        return /^[a-z]{2}$/.test(value);
      }
    },
    message: (props: { value: string }) =>
      `Language code '${props.value}' is not supported. Please use a valid 2-letter language code.`,
  },
};
