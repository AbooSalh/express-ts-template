/**
 * Password strength validation utility
 * Validates password requirements for security
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validatePasswordStrength = (
  password: string
): PasswordValidationResult => {
  const errors: string[] = [];
  const minLength = 8;

  // Check minimum length
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // Check for numbers
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Check for special characters
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Express-validator custom validation function
 * Throws an error if password doesn't meet requirements
 */
export const passwordStrengthValidator = (value: string): boolean => {
  const result = validatePasswordStrength(value);

  if (!result.isValid) {
    throw new Error(result.errors[0]); // Throw the first error for express-validator
  }

  return true;
};

/**
 * Get password requirements description for frontend
 */
export const getPasswordRequirements = () => {
  return {
    minLength: 8,
    requirements: [
      "At least 8 characters long",
      "At least one uppercase letter (A-Z)",
      "At least one lowercase letter (a-z)",
      "At least one number (0-9)",
      "At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)",
    ],
  };
};
