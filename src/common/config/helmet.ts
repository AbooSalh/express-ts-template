import type { HelmetOptions } from "helmet";
import env from "@/common/config/env.config";

// helmet config
const isProduction = env.NODE_ENV === "production";

export const helmetConfig: HelmetOptions = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Remove 'unsafe-inline' in production
      scriptSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"],
      styleSrc: isProduction
        ? ["'self'", "https://fonts.googleapis.com"]
        : ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      upgradeInsecureRequests: [],
      // Additional security
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  // Prevent MIME type sniffing
  noSniff: true,
  // Prevent clickjacking
  frameguard: {
    action: "deny",
  },
  // XSS Protection
  xssFilter: true,
  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  // Additional security headers
  crossOriginEmbedderPolicy: false, // Allow external resources
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  ieNoOpen: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
};
export default helmetConfig;
