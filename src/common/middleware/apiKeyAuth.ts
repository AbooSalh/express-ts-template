import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import env from "@/common/config/env.config";
import ApiError from "@/common/utils/api/ApiError";

export const apiKeyAuth = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Skip if API key auth is disabled
    if (!env.ENABLE_API_KEY_AUTH) {
      return next();
    }

    const apiKeyHeader = req.headers["x-api-key"];
    const authHeader = req.headers["authorization"];

    const apiKey = Array.isArray(apiKeyHeader)
      ? apiKeyHeader[0]
      : apiKeyHeader || authHeader?.replace("Bearer ", "");

    if (!apiKey) {
      throw new ApiError("API key required", "UNAUTHORIZED");
    }

    const allowedKeys = env.API_KEYS
      ? env.API_KEYS.split(",")
          .map((key) => key.trim())
          .filter(Boolean)
      : [];

    if (allowedKeys.length === 0 || !allowedKeys.includes(apiKey)) {
      throw new ApiError("Invalid API key", "UNAUTHORIZED");
    }

    next();
  }
);

// Optional API key auth - doesn't fail if no key provided
export const optionalApiKeyAuth = expressAsyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!env.ENABLE_API_KEY_AUTH) {
      return next();
    }

    const apiKeyHeader = req.headers["x-api-key"];
    const authHeader = req.headers["authorization"];

    const apiKey = Array.isArray(apiKeyHeader)
      ? apiKeyHeader[0]
      : apiKeyHeader || authHeader?.replace("Bearer ", "");

    if (apiKey && env.API_KEYS) {
      const allowedKeys = env.API_KEYS.split(",")
        .map((key) => key.trim())
        .filter(Boolean);
      if (allowedKeys.includes(apiKey)) {
        (req as any).user = { ...(req as any).user, hasApiKey: true };
      }
    }

    next();
  }
);
