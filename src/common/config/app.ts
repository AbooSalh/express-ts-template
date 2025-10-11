import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import requestLogger from "../middleware/requestLogger";
import { autoParseJsonFields } from "@/common/utils/api/autoParseJsonFields";
import corsOptions from "./cors";
import createRateLimiter, {
  authRateLimiter,
} from "@/common/utils/api/rateLimiter";
import { mountRoutes } from "@/index";

export function createApp() {
  const app = express();

  // Trust proxies (Nginx/ELB) for correct IPs & rate-limit keys
  app.set("trust proxy", 1);

  // Static files FIRST - before any middleware
  app.use("/uploads", (req, res, next) => {
    // Add CORS headers for static files
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    next();
  }, express.static("public/uploads"));

  // Body Parsing
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(express.json({ limit: "10mb" }));
  app.use(autoParseJsonFields);
  // Optimized compression for production
  app.use(compression({
    level: 6, // Good balance between compression ratio and CPU usage
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      // Don't compress if client doesn't support it
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Compress all text-based responses
      return compression.filter(req, res);
    },
    // Compress specific MIME types for better performance
    chunkSize: 16 * 1024, // 16KB chunks for better streaming
  }));

  // Request Logging
  app.use(requestLogger);

  // Security
  app.use(helmet());
  app.use(
    mongoSanitize({
      replaceWith: "_",
      allowDots: true,
    })
  );
  app.use(hpp());

  // Rate Limiting (exclude static files)
  app.use((req, res, next) => {
    // Skip rate limiting for static file uploads
    if (req.path.startsWith('/uploads/')) {
      return next();
    }
    return createRateLimiter()(req, res, next);
  });
  app.use("/api/v1/auth", authRateLimiter);

  // CORS
  app.use(cors(corsOptions));
  
  // Handle credentials
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
  });
  // Routes
  mountRoutes(app);

  return app;
}

export default createApp;
