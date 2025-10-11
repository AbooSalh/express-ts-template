import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Server Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(5050),
  BASE_URL: Joi.string().default('http://localhost:5050'),

  // Database Configuration
  DB_URL: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().allow('').default(''),
  DB_PASSWORD: Joi.string().allow('').default(''),

  // JWT Configuration
  JWT_SECRET: Joi.string().required(),
  JWT_ISSUER: Joi.string().default('paradise-sharm-tours'),
  JWT_AUDIENCE: Joi.string().default('paradise-sharm-tours-users'),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Email Configuration
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().required(),
  SMTP_PASSWORD: Joi.string().required(),
  SMTP_FROM_NAME: Joi.string().default('Paradise Sharm Tours'),
  SMTP_FROM_EMAIL: Joi.string().default(Joi.ref('SMTP_USER')),
  SMTP_SECURE: Joi.boolean().default(false),

  // CORS Configuration
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),

  // Security Configuration
  BCRYPT_ROUNDS: Joi.number().default(12),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MINUTES: Joi.number().default(15),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  UPLOAD_RATE_LIMIT_WINDOW_MINUTES: Joi.number().default(60),
  UPLOAD_RATE_LIMIT_MAX_REQUESTS: Joi.number().default(20),
  AUTH_RATE_LIMIT_WINDOW_MINUTES: Joi.number().default(15),
  AUTH_RATE_LIMIT_MAX_REQUESTS: Joi.number().default(10),
  STRICT_RATE_LIMIT_WINDOW_MINUTES: Joi.number().default(15),
  STRICT_RATE_LIMIT_MAX_REQUESTS: Joi.number().default(5),
  API_RATE_LIMIT_WINDOW_MINUTES: Joi.number().default(1),
  API_RATE_LIMIT_MAX_REQUESTS: Joi.number().default(1000),

  // File Upload Limits
  MAX_FILE_SIZE: Joi.number().default(10 * 1024 * 1024), // 10MB
  ALLOWED_FILE_TYPES: Joi.string().default('jpg,jpeg,png,gif,webp,ico,svg'),

  // Monitoring Configuration
  UPLOADS_PATH: Joi.string().default('public/uploads'),
  DISK_CHECK_CRON: Joi.string().default('*/5 * * * *'),
  DISK_WARN_PCT: Joi.number().default(80),
  DISK_CRIT_PCT: Joi.number().default(90),
  UPLOADS_WARN_GB: Joi.number().default(10),
  ALERT_EMAIL_TO: Joi.string().allow('').default(''),

  // Backup Configuration
  BACKUP_DIR: Joi.string().default('backups'),
  BACKUP_CRON: Joi.string().default('0 3 * * *'),
  BACKUP_RETENTION_DAYS: Joi.number().default(7),

  // Health Check Configuration
  HEALTH_CHECK_TIMEOUT: Joi.number().default(5000),
  ENABLE_HEALTH_CHECKS: Joi.boolean().default(true),

  // Alert & Report Configuration
  CRITICAL_ALERT_COOLDOWN_MINUTES: Joi.number().default(30),
  DAILY_REPORT_CRON: Joi.string().default('0 9 */5 * *'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'debug')
    .default('info'),
  LOG_FILE_PATH: Joi.string().default('logs'),

  // Optional configs
  SENTRY_DSN: Joi.string().allow('').default(''),
  ENABLE_MONITORING: Joi.boolean().default(false),
  API_KEYS: Joi.string().allow('').default(''),
  ENABLE_API_KEY_AUTH: Joi.boolean().default(false),
  REDIS_URL: Joi.string().allow('').default(''),
  CACHE_TTL: Joi.number().default(300),
  STRIPE_SECRET_KEY: Joi.string().allow('').default(''),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow('').default(''),
});
