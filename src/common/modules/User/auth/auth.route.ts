import express from "express";
import authController from "./auth.controller";
import authMiddleware from "@/common/middleware/auth";
import { authRateLimiter } from "@/common/utils/api/rateLimiter";

const router = express.Router();

// Public routes (no authentication required) with per-endpoint rate limiting
router.post("/register", authRateLimiter, authController.register.validator, authController.register.handler);
router.post("/login", authRateLimiter, authController.login.validator, authController.login.handler);
router.post(
  "/forgot-password",
  authRateLimiter,
  authController.forgotPassword.validator, authController.forgotPassword.handler
);
router.post(
  "/verify-reset-code",
  authRateLimiter,
  authController.verifyResetCode.validator, authController.verifyResetCode.handler
);
router.post(
  "/reset-password",
  authRateLimiter,
  authController.resetPassword.validator, authController.resetPassword.handler
);
router.post(
  "/verify-email",
  authRateLimiter,
  authController.verifyEmail.validator, authController.verifyEmail.handler
);
router.post(
  "/resend-email-verification",
  authRateLimiter,
  authController.resendEmailVerificationCode.validator, authController.resendEmailVerificationCode.handler
);
router.post(
  "/resend-password-reset",
  authRateLimiter,
  authController.resendPasswordResetCode.handler
);

// Refresh token route (no authentication required)
router.post(
  "/refresh-token",
  authRateLimiter,
  authController.refreshToken.handler
);

// Protected routes (authentication required)
router.post("/logout", authMiddleware(), authController.logout.handler);
router.get(
  "/sessions",
  authMiddleware(),
  authController.getUserSessions.handler
);
router.delete(
  "/sessions/:sessionId",
  authMiddleware(),
  authController.revokeSession.handler
);
const authR = router;
export default authR;
