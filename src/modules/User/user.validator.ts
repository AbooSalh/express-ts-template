import { body } from "express-validator";
import UserModel from "./model";
import validatorMiddleware from "@/common/middleware/validators/validator";
import bcrypt from "bcryptjs";

// Account Deletion Validators
export const sendDeleteAccountCodeValidator = [validatorMiddleware];

export const deleteAccountValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  body("password").notEmpty().withMessage("Password is required"),
  body("code").notEmpty().withMessage("Verification code is required"),
  validatorMiddleware,
];

export const emailValidator = [
  body("email")
    .exists()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail({ gmail_remove_dots: false })
    .custom(async (email) => {
      const exists = await UserModel.findOne({ email });
      if (exists) {
        throw new Error("Email already in use");
      }
    }),
];

export const changePasswordValidator = [
  body("currentPassword")
    .exists()
    .withMessage("Current password is required")
    .isString()
    .withMessage("Current password must be a string")
    .custom(async (value, { req }) => {
      const id = req.user?._id as string;
      const user = await UserModel.findById(id).select("+password");
      if (!user) {
        throw new Error("Not found");
      }
      const isMatch = await bcrypt.compare(value, user.password);
      if (!isMatch) {
        throw new Error("Current password is incorrect");
      }
      return true;
    }),
  body("newPassword")
    .exists()
    .withMessage("New password is required")
    .isString()
    .withMessage("New password must be a string"),
  validatorMiddleware,
];

export const updateAuthUserValidator = [
  body("name")
    .exists()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),
  ...emailValidator,
  validatorMiddleware,
];
