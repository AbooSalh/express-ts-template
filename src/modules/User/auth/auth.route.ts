// ...existing code...
// ...existing code...
import express from "express";
import authController from "./auth.controller";
import createRateLimiter from "@/common/utils/api/rateLimiter";
// import {
//   createBouncer,
// } from "@/common/utils/api/rateLimiter";

const authRouter = express.Router();

// General rate limiter for most auth endpoints (e.g., register, forgot-password)
const generalAuthLimiter = createRateLimiter({
  minutes: 1,
  max: 10, // allow more requests for register, etc.
});

// Stricter rate limiter for brute-force sensitive endpoints (login, reset, verify)
const bruteForceLimiter = createRateLimiter({
  minutes: 1,
  max: 5, // lower limit for login, reset, etc.
});

// Register: more requests allowed
authRouter.post(
  "/register",
  generalAuthLimiter,
  authController.register.validator,
  authController.register.handler
);
// Login: strict limiter
authRouter.post(
  "/login",
  bruteForceLimiter,
  authController.login.validator,
  authController.login.handler
);
// Forgot password: general limiter
authRouter.post(
  "/forgot-password",
  generalAuthLimiter,
  authController.forgotPassword.validator,
  authController.forgotPassword.handler
);
// Verify reset code: strict limiter
authRouter.post(
  "/verify-reset-code",
  bruteForceLimiter,
  authController.verifyResetCode.validator,
  authController.verifyResetCode.handler
);
// Reset password: strict limiter
authRouter.put(
  "/reset-password",
  bruteForceLimiter,
  authController.resetPassword.validator,
  authController.resetPassword.handler
);
// Verify email: strict limiter
authRouter.post(
  "/verify-email",
  bruteForceLimiter,
  authController.verifyEmail.validator,
  authController.verifyEmail.handler
);
// Resend email verification code: strict limiter
authRouter.post(
  "/resend-email-verification-code",
  bruteForceLimiter,
  authController.resendEmailVerificationCode.validator,
  authController.resendEmailVerificationCode.handler
);

// Resend password reset code: strict limiter
authRouter.post(
  "/resend-password-reset-code",
  bruteForceLimiter,
  authController.resendPasswordResetCode.validator,
  authController.resendPasswordResetCode.handler
);
export default authRouter;
