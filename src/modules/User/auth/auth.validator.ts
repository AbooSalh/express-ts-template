import { body } from "express-validator";
import validatorMiddleware from "@/common/middleware/validators/validator";
import { emailValidator } from "../user.validator";
export const verifyEmailValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email"),
  body("code").notEmpty().withMessage("Verification code is required"),
  validatorMiddleware,
];

export const registerValidator = [
  body("name").notEmpty().withMessage("Name is required"),
  body("password").notEmpty().withMessage("Password is required"),
  ...emailValidator,
  validatorMiddleware,
];

export const loginValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email"),
  body("password").notEmpty().withMessage("Password is required"),
  validatorMiddleware,
];

export const forgotPasswordValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email"),
  validatorMiddleware,
];

export const verifyResetCodeValidator = [
  body("code").notEmpty().withMessage("Reset code is required"),
  validatorMiddleware,
];

export const resetPasswordValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email"),
  body("newPassword").notEmpty().withMessage("New password is required"),
  validatorMiddleware,
];
