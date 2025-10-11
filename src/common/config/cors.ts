import type { CorsOptions } from "cors";
import env from "@/common/config/env.config";

// Parse CORS origins (supports comma-separated values)
const parseOrigins = (origins: string): string | string[] => {
  const parsed = origins.split(',').map(origin => origin.trim()).filter(Boolean);
  return parsed.length === 1 ? parsed[0] : parsed;
};

const corsOptions: CorsOptions = {
  origin: parseOrigins(env.CORS_ORIGIN),
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
  exposedHeaders: "Content-Length, X-Foo, X-Bar",
  optionsSuccessStatus: 200,
  credentials: true,
};

export default corsOptions;
