import { randomInt } from "crypto";

/**
 * Generates a secure random numeric code for password reset
 * @param length - Length of the numeric code (default: 6)
 * @returns A string of the specified length containing only digits
 */
export const generateCode = (length: number = 6): string => {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    const index = randomInt(0, digits.length);
    code += digits[index];
  }
  return code;
};

export default generateCode;
