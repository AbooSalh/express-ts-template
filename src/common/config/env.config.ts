import { cleanEnv, str, port, url, email, num, bool } from "envalid";

export const env = cleanEnv(process.env, {
  // Server Configuration
  NODE_ENV: str({
    choices: ["development", "production", "test"],
    default: "development",
  }),
  PORT: port({ default: 5050 }),
  BASE_URL: url({
    desc: "Base URL for API requests",
    example: "http://localhost:5050",
    default: "http://localhost:5050",
  }),
  // Database Configuration
  DB_URL: url({
    desc: "MongoDB connection URL",
    example: "mongodb://localhost:27017/your-database",
  }),
  DB_NAME: str({
    desc: "Database name",
    example: "paradise-sharm-tours",
  }),
  DB_USER: str({
    desc: "Database username",
    default: "",
  }),
  DB_PASSWORD: str({
    desc: "Database password",
    default: "",
  }),

  // JWT Configuration
  JWT_SECRET: str({
    desc: "JWT secret key for token signing",
    example: "your-super-secret-jwt-key-here",
  }),
  JWT_ISSUER: str({
    desc: "JWT issuer",
    default: "paradise-sharm-tours",
  }),
  JWT_AUDIENCE: str({
    desc: "JWT audience",
    default: "paradise-sharm-tours-users",
  }),
  JWT_EXPIRES_IN: str({
    desc: "JWT token expiration time",
    default: "1d",
  }),
  JWT_REFRESH_EXPIRES_IN: str({
    desc: "JWT refresh token expiration time",
    default: "7d",
  }),

  // Email Configuration
  SMTP_HOST: str({
    desc: "SMTP server host",
    example: "smtp.gmail.com",
  }),
  SMTP_PORT: num({
    desc: "SMTP server port",
    default: 587,
  }),
  SMTP_USER: email({
    desc: "SMTP username/email",
    example: "your-email@gmail.com",
  }),
  SMTP_PASSWORD: str({
    desc: "SMTP password or app password",
    example: "your-app-password",
  }),
  SMTP_FROM_NAME: str({
    desc: "Email sender name",
    default: "Paradise Sharm Tours",
  }),
  SMTP_FROM_EMAIL: email({
    desc: "Email sender address",
    default: process.env.SMTP_USER,
  }),
  SMTP_SECURE: bool({
    desc: "Use secure connection for SMTP",
    default: false,
  }),

  // CORS Configuration
  CORS_ORIGIN: str({
    desc: "CORS allowed origins (comma-separated for multiple)",
    example: "http://localhost:3000,http://client:3000",
    default: "http://localhost:3000",
  }),

  // Security Configuration
  BCRYPT_ROUNDS: num({
    desc: "Number of bcrypt rounds for password hashing",
    default: 12,
  }),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MINUTES: num({
    desc: "Rate limiting window in minutes",
    default: 15, // 15 minutes
  }),
  RATE_LIMIT_MAX_REQUESTS: num({
    desc: "Maximum requests per window",
    default: 100,
  }),

  // Upload Rate Limiting (configurable separate from general API limits)
  UPLOAD_RATE_LIMIT_WINDOW_MINUTES: num({
    desc: "Upload rate limiting window in minutes",
    default: 60, // 1 hour
  }),
  UPLOAD_RATE_LIMIT_MAX_REQUESTS: num({
    desc: "Maximum upload requests per window",
    default: 20,
  }),

  // Auth Rate Limiting
  AUTH_RATE_LIMIT_WINDOW_MINUTES: num({
    desc: "Auth endpoints rate limiting window in minutes",
    default: 15, // 15 minutes
  }),
  AUTH_RATE_LIMIT_MAX_REQUESTS: num({
    desc: "Maximum auth endpoint requests per window",
    default: 10,
  }),

  // Strict Rate Limiting (for highly sensitive endpoints)
  STRICT_RATE_LIMIT_WINDOW_MINUTES: num({
    desc: "Strict limiter window in minutes",
    default: 15, // 15 minutes
  }),
  STRICT_RATE_LIMIT_MAX_REQUESTS: num({
    desc: "Maximum requests for strict limiter per window",
    default: 5,
  }),

  // External API Rate Limiting
  API_RATE_LIMIT_WINDOW_MINUTES: num({
    desc: "External API limiter window in minutes",
    default: 1, // 1 minute
  }),
  API_RATE_LIMIT_MAX_REQUESTS: num({
    desc: "Maximum external API requests per window",
    default: 1000,
  }),

  // Logging Configuration
  LOG_LEVEL: str({
    choices: ["error", "warn", "info", "http", "debug"],
    default: "info",
  }),
  LOG_FILE_PATH: str({
    desc: "Path to log files",
    default: "logs",
  }),

  // Monitoring & Error Tracking
  SENTRY_DSN: str({
    desc: "Sentry DSN for error tracking",
    default: "",
  }),
  ENABLE_MONITORING: bool({
    desc: "Enable application monitoring",
    default: false,
  }),

  // API Security
  API_KEYS: str({
    desc: "Comma-separated API keys for external services",
    default: "",
  }),
  ENABLE_API_KEY_AUTH: bool({
    desc: "Enable API key authentication for certain endpoints",
    default: false,
  }),

  // File Upload Limits
  MAX_FILE_SIZE: num({
    desc: "Maximum file size in bytes",
    default: 10 * 1024 * 1024, // 10MB
  }),
  ALLOWED_FILE_TYPES: str({
    desc: "Comma-separated allowed file types",
    default: "jpg,jpeg,png,gif,webp,ico,svg",
  }),

  // Cache Configuration
  REDIS_URL: str({
    desc: "Redis connection URL for caching",
    default: "",
  }),
  CACHE_TTL: num({
    desc: "Cache TTL in seconds",
    default: 300, // 5 minutes
  }),

  // Optional: External APIs
  STRIPE_SECRET_KEY: str({
    desc: "Stripe secret key for payments",
    default: "",
  }),
  STRIPE_WEBHOOK_SECRET: str({
    desc: "Stripe webhook secret",
    default: "",
  }),

  // Monitoring & Health Check Configuration
  UPLOADS_PATH: str({
    desc: "Path to uploads directory",
    default: "public/uploads",
  }),
  DISK_CHECK_CRON: str({
    desc: "Cron schedule for disk space monitoring",
    default: "*/5 * * * *", // every 5 minutes
  }),
  DISK_WARN_PCT: num({
    desc: "Disk usage warning threshold percentage",
    default: 80,
  }),
  DISK_CRIT_PCT: num({
    desc: "Disk usage critical threshold percentage",
    default: 90,
  }),
  UPLOADS_WARN_GB: num({
    desc: "Uploads directory size warning threshold in GB",
    default: 10,
  }),
  ALERT_EMAIL_TO: email({
    desc: "Email address for monitoring alerts",
    default: "",
  }),

  // Backup Configuration
  BACKUP_DIR: str({
    desc: "Directory for storing backups",
    default: "backups",
  }),
  BACKUP_CRON: str({
    desc: "Cron schedule for automated backups",
    default: "0 3 * * *", // daily at 3am
  }),
  BACKUP_RETENTION_DAYS: num({
    desc: "Number of days to retain backups",
    default: 7,
  }),

  // Health Check Configuration
  HEALTH_CHECK_TIMEOUT: num({
    desc: "Timeout for health checks in milliseconds",
    default: 5000,
  }),
  ENABLE_HEALTH_CHECKS: bool({
    desc: "Enable health check endpoints",
    default: true,
  }),

  // Alert & Report Configuration
  CRITICAL_ALERT_COOLDOWN_MINUTES: num({
    desc: "Minutes between critical alerts for the same issue (prevents spam)",
    default: 30,
  }),
  DAILY_REPORT_CRON: str({
    desc: "Cron schedule for daily system reports (default: every 5 days at 9:00 AM)",
    default: "0 9 */5 * *", // every 5 days at 9:00 AM
  }),
});

// Export validated environment variables
export default env;
