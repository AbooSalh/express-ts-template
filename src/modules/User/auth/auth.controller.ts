
import { RequestHandler } from "express";
import expressAsyncHandler from "express-async-handler";
import ApiSuccess from "@/common/utils/api/ApiSuccess";
import * as authService from "./auth.service";
import * as authValidator from "./auth.validator";
const resendEmailVerificationCodeHandler: RequestHandler = expressAsyncHandler(
  async (req, res) => {
    const result = await authService.resendEmailVerificationCode(req);
    ApiSuccess.send(res, "OK", result.message);
  }
);

const resendPasswordResetCodeHandler: RequestHandler = expressAsyncHandler(
  async (req, res) => {
    const result = await authService.resendPasswordResetCode(req);
    ApiSuccess.send(res, "OK", result.message);
  }
);
const verifyEmailHandler: RequestHandler = expressAsyncHandler(
  async (req, res) => {
    const result = await authService.verifyEmail(req);
    ApiSuccess.send(res, "OK", result.message);
  }
);
const registerHandler: RequestHandler = expressAsyncHandler(
  async (req, res) => {
    const result = await authService.register(req);
    ApiSuccess.send(res, "OK", "User created successfully", result);
  }
);

const loginHandler: RequestHandler = expressAsyncHandler(async (req, res) => {
  const result = await authService.login(req);
  ApiSuccess.send(res, "OK", "User logged in successfully", result);
});

const forgotPasswordHandler: RequestHandler = expressAsyncHandler(
  async (req, res) => {
    await authService.forgotPassword(req);
    ApiSuccess.send(res, "OK", "Reset code has been sent to your email");
  }
);

const verifyResetCodeHandler: RequestHandler = expressAsyncHandler(
  async (req, res) => {
    await authService.verifyResetCode(req);
    ApiSuccess.send(res, "OK", "Reset code verified successfully");
  }
);

const resetPasswordHandler: RequestHandler = expressAsyncHandler(
  async (req, res) => {
    const result = await authService.resetPassword(req);
    ApiSuccess.send(res, "OK", "Password reset successfully", result);
  }
);

const authController = {
  register: {
    handler: registerHandler,
    validator: authValidator.registerValidator,
  },
  login: {
    handler: loginHandler,
    validator: authValidator.loginValidator,
  },
  forgotPassword: {
    handler: forgotPasswordHandler,
    validator: authValidator.forgotPasswordValidator,
  },
  verifyResetCode: {
    handler: verifyResetCodeHandler,
    validator: authValidator.verifyResetCodeValidator,
  },
  resetPassword: {
    handler: resetPasswordHandler,
    validator: authValidator.resetPasswordValidator,
  },
  resendEmailVerificationCode: {
    handler: resendEmailVerificationCodeHandler,
    validator: authValidator.forgotPasswordValidator, // just needs email
  },
  resendPasswordResetCode: {
    handler: resendPasswordResetCodeHandler,
    validator: authValidator.forgotPasswordValidator, // just needs email
  },
  verifyEmail: {
    handler: verifyEmailHandler,
    validator: authValidator.verifyEmailValidator,
  },
};

export default authController;
