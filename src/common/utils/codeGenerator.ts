import { randomBytes } from "crypto";

/**
 * Generates a cryptographically secure random alphanumeric code
 * @param length - Length of the code (default: 16)
 * @returns A string of the specified length containing alphanumeric characters
 */
export const generateSecureCode = (length: number = 16): string => {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);
  let code = "";

  for (let i = 0; i < length; i++) {
    const index = bytes[i] % charset.length;
    code += charset[index];
  }

  return code;
};

/**
 * Generates a secure random numeric code for backward compatibility
 * @param length - Length of the numeric code (default: 6)
 * @returns A string of the specified length containing only digits
 * @deprecated Use generateSecureCode instead for better security
 */
export const generateCode = (length: number = 6): string => {
  const digits = "0123456789";
  const bytes = randomBytes(length);
  let code = "";

  for (let i = 0; i < length; i++) {
    const index = bytes[i] % digits.length;
    code += digits[index];
  }

  return code;
};

export default generateSecureCode;
