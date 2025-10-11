// Exported function to create a rate limiter middleware

import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";
import env from "@/common/config/env.config";

// Base rate limiter configuration
const baseRateLimiter = {
  windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000, // Convert minutes to ms
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    status: "error",
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
};

// Create different rate limiters for different use cases
export const createRateLimiter = (options: any = {}): RequestHandler => {
  // Disable all rate limiting during test runs
  if (env.NODE_ENV === "test" || env.NODE_ENV === "development") {
    return (_req, _res, next) => next();
  }

  return rateLimit({
    ...baseRateLimiter,
    ...options,
  });
};

// Strict rate limiter for sensitive endpoints
export const strictRateLimiter = createRateLimiter({
  max: env.STRICT_RATE_LIMIT_MAX_REQUESTS,
  windowMs: env.STRICT_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000, // Convert minutes to ms
  message: {
    status: "error",
    message: "Too many attempts, please try again later.",
  },
});

// Auth-specific rate limiter
export const authRateLimiter = createRateLimiter({
  max: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000, // Convert minutes to ms
  message: {
    status: "error",
    message: "Too many authentication attempts, please try again later.",
  },
});

// File upload rate limiter (configurable via env)
export const uploadRateLimiter = createRateLimiter({
  max: env.UPLOAD_RATE_LIMIT_MAX_REQUESTS,
  windowMs: env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000, // Convert minutes to ms
  message: {
    status: "error",
    message: "Too many file uploads, please try again later.",
  },
});

// API rate limiter for external services
export const apiRateLimiter = createRateLimiter({
  max: env.API_RATE_LIMIT_MAX_REQUESTS,
  windowMs: env.API_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000, // Convert minutes to ms
  message: {
    status: "error",
    message: "API rate limit exceeded, please try again later.",
  },
});

// Contact form rate limiter to prevent spam
export const contactRateLimiter = createRateLimiter({
  max: 10, // 5 contact form submissions
  windowMs: 15 * 60 * 1000, // per 15 minutes
  message: {
    status: "error",
    message: "Too many contact form submissions. Please wait before sending another message.",
  },
  skipSuccessfulRequests: false, // Count successful requests too
  skipFailedRequests: false, // Count failed requests too
});

export default createRateLimiter;

