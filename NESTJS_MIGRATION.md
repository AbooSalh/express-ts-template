# NestJS Migration Guide

## Overview

This application has been converted from Express.js to NestJS while preserving all modules, features, and business logic. The NestJS version runs alongside the original Express implementation, allowing you to choose which one to use.

## Quick Start

### Running the NestJS Version

```bash
# Development mode with hot-reload
npm run dev:nest

# Build for production
npm run build:nest

# Run production build
npm run start:nest
# or
npm run start:prod
```

### Running the Original Express Version

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Run production build
npm run start
```

## Architecture Changes

### Module Structure

All modules have been converted to NestJS modules with the following structure:

```
src/
├── app.module.ts           # Root NestJS module
├── main.ts                 # NestJS bootstrap file
└── common/
    ├── filters/            # Exception filters (replaces Express error handlers)
    ├── guards/             # Route guards (replaces Express middleware)
    ├── middleware/         # NestJS middleware
    └── modules/
        ├── User/
        │   ├── user.module.ts
        │   ├── user.controller.nest.ts
        │   ├── user.service.nest.ts
        │   └── auth/
        │       ├── auth.module.ts
        │       ├── auth.controller.nest.ts
        │       ├── auth.service.nest.ts
        │       └── dto/
        │           └── auth.dto.ts
        ├── Language/
        │   ├── language.module.ts
        │   └── language.controller.nest.ts
        ├── EventLog/
        │   ├── eventlog.module.ts
        │   └── eventlog.controller.nest.ts
        ├── Image/
        │   ├── image.module.ts
        │   └── image.controller.nest.ts
        └── Monitoring/
            ├── monitoring.module.ts
            └── monitoring.controller.nest.ts
```

### Key Components

#### 1. **AppModule** (`src/app.module.ts`)
- Configures MongoDB connection using `@nestjs/mongoose`
- Sets up global ConfigModule for environment variables
- Configures ThrottlerModule for rate limiting
- Imports all feature modules

#### 2. **Main Bootstrap** (`src/main.ts`)
- Initializes NestJS application
- Configures security middleware (helmet, mongoSanitize, hpp)
- Sets up compression
- Enables CORS
- Configures global validation pipes
- Registers global exception filter
- Sets API prefix to `/api/v1`

#### 3. **Guards** (`src/common/guards/`)
- **AuthGuard**: Replaces Express auth middleware, handles JWT validation and role-based access control
- Uses `@Roles()` decorator to specify allowed roles

#### 4. **Filters** (`src/common/filters/`)
- **GlobalExceptionFilter**: Replaces Express global error handler
- Handles all exceptions including ApiError, HttpException, and Mongoose errors
- Provides consistent error response format

#### 5. **Controllers**
All controllers follow NestJS conventions:
- Use decorators (`@Controller`, `@Get`, `@Post`, etc.)
- Inject services via constructor
- Use DTOs for request validation
- Return consistent response structures

#### 6. **Services**
Services act as adapters to existing Express business logic:
- Wrap existing service functions
- Maintain compatibility with existing Mongoose models
- Preserve all business logic

## Converted Modules

### Authentication Module
**Location**: `src/common/modules/User/auth/`

**Endpoints**:
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/verify-reset-code` - Verify reset code
- `POST /api/v1/auth/reset-password` - Reset password
- `POST /api/v1/auth/verify-email` - Verify email
- `POST /api/v1/auth/resend-email-verification` - Resend verification code
- `POST /api/v1/auth/resend-password-reset` - Resend password reset
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/logout` - Logout (requires auth)
- `GET /api/v1/auth/sessions` - Get user sessions (requires auth)
- `DELETE /api/v1/auth/sessions/:sessionId` - Revoke session (requires auth)

**Features**:
- JWT authentication
- Email verification
- Password reset flow
- Refresh token support
- Session management
- Rate limiting (10 requests per minute)

### User Module
**Location**: `src/common/modules/User/`

**Endpoints**:
- `GET /api/v1/users` - List all users (admin only)
- `GET /api/v1/users/profile` - Get current user profile
- `GET /api/v1/users/:id` - Get user by ID (admin only)
- `POST /api/v1/users` - Create user (admin only)
- `POST /api/v1/users/send-delete-account-code` - Request account deletion
- `DELETE /api/v1/users/delete-account` - Delete account
- `PATCH /api/v1/users/change-password` - Change password
- `PUT /api/v1/users/update` - Update current user
- `PUT /api/v1/users/:id` - Update user (admin only)
- `DELETE /api/v1/users/:id` - Delete user (admin only)

### Language Module
**Location**: `src/common/modules/Language/`

**Endpoints**:
- `GET /api/v1/languages` - List languages
- `POST /api/v1/languages` - Create language (admin only)
- `PUT /api/v1/languages/:id` - Update language (admin only)
- `DELETE /api/v1/languages/:id` - Delete language (admin only)

### EventLog Module
**Location**: `src/common/modules/EventLog/`

**Endpoints**:
- `GET /api/v1/events` - List event logs (admin only)
- `GET /api/v1/events/analytics` - Get analytics (admin only)

### Image Module
**Location**: `src/common/modules/Image/`

**Endpoints**:
- `GET /api/v1/images` - List images
- `POST /api/v1/images` - Upload images (admin only, rate limited)
- `GET /api/v1/images/variant-presets` - Get variant presets (admin only)
- `GET /api/v1/images/stats` - Get image statistics (admin only)
- `GET /api/v1/images/folders` - List folders (admin only)
- `POST /api/v1/images/folders` - Create folder (admin only)
- `GET /api/v1/images/folders/stats` - Get folder stats (admin only)
- `PUT /api/v1/images/folders/:oldName` - Rename folder (admin only)
- `DELETE /api/v1/images/folders/:name` - Delete folder (admin only)
- `PUT /api/v1/images/move-to-folder` - Move images to folder (admin only)
- `DELETE /api/v1/images/bulk` - Bulk delete (admin only)
- `DELETE /api/v1/images/bulk/enhanced` - Enhanced bulk delete (admin only)
- `PUT /api/v1/images/bulk/move` - Bulk move (admin only)
- `POST /api/v1/images/organize` - Auto-organize images (admin only)
- `POST /api/v1/images/bulk-download` - Bulk download as ZIP (admin only)
- `GET /api/v1/images/:id` - Get image by ID
- `PUT /api/v1/images/:id` - Update image (admin only)
- `DELETE /api/v1/images/:id` - Delete image (admin only)
- `GET /api/v1/images/:id/translations` - Get translations
- `POST /api/v1/images/:id/translations` - Create translation (admin only)
- `PUT /api/v1/images/:id/translations/:language` - Update translation (admin only)
- `DELETE /api/v1/images/:id/translations/:language` - Delete translation (admin only)
- `PUT /api/v1/images/:id/translations/:language/upsert` - Upsert translation (admin only)

**Features**:
- File upload handling with multer
- Image processing with sharp
- Folder management
- Bulk operations
- Translation support
- Upload rate limiting (20 requests per hour)

### Monitoring Module
**Location**: `src/common/modules/Monitoring/`

**Endpoints**:
- `GET /api/v1/monitoring/health` - Health check (public)
- `GET /api/v1/monitoring/stats` - System stats (admin only)
- `GET /api/v1/monitoring/health-checks` - Health checks (admin only)
- `GET /api/v1/monitoring/disk-usage` - Disk usage (admin only)
- `GET /api/v1/monitoring/backups` - List backups (admin only)
- `POST /api/v1/monitoring/backups` - Create backup (admin only)
- `GET /api/v1/monitoring/alerts` - Get alerts (admin only)
- `PUT /api/v1/monitoring/alerts/:id/resolve` - Resolve alert (admin only)
- `GET /api/v1/monitoring/system` - System info (admin only)
- `POST /api/v1/monitoring/reports/daily` - Trigger daily report (admin only)

## Configuration

The NestJS app uses the same environment configuration as the Express app through the `env.config.ts` file. All environment variables remain the same.

### Environment Variables

See `.env.example` for the full list of required environment variables. Key variables include:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `DB_URL` - MongoDB connection URL
- `DB_NAME` - Database name
- `JWT_SECRET` - JWT secret key
- `CORS_ORIGIN` - Allowed CORS origins
- Rate limiting configuration
- Email configuration
- Monitoring configuration

## Middleware & Security

### Global Middleware (Applied to all routes)
1. **Helmet** - Security headers
2. **MongoDB Sanitize** - Prevents NoSQL injection
3. **HPP** - HTTP Parameter Pollution protection
4. **Compression** - Response compression
5. **CORS** - Cross-Origin Resource Sharing
6. **Rate Limiting** - Request throttling

### Route Guards
- **AuthGuard** - JWT authentication and role-based access control
- Use `@UseGuards(AuthGuard)` decorator
- Use `@Roles('admin', 'user')` to specify allowed roles

### Validation
- DTOs with class-validator decorators
- Global ValidationPipe for automatic request validation
- Whitelist mode enabled to strip unknown properties

## Migration Strategy

The conversion was designed to preserve all existing functionality:

1. **Code Reuse**: The NestJS controllers and services wrap existing Express business logic, avoiding the need to rewrite all services.

2. **Mongoose Models**: All existing Mongoose models are reused without changes.

3. **Utilities**: All utility functions (logger, email, JWT, etc.) are reused.

4. **Backward Compatibility**: The Express version still works alongside the NestJS version.

## Testing

The same test infrastructure works for both versions since they share the same business logic and models.

```bash
# Run tests
npm test
```

## Comparison: Express vs NestJS

### Express Version
- **Entry Point**: `src/server.ts`
- **Routes**: Defined in `src/index.ts`
- **Middleware**: Applied in `src/common/config/app.ts`
- **Start Command**: `npm run dev` or `npm start`

### NestJS Version
- **Entry Point**: `src/main.ts`
- **Routes**: Defined in module controllers
- **Middleware**: Applied in `main.ts` and via decorators
- **Start Command**: `npm run dev:nest` or `npm run start:nest`

## Benefits of NestJS Version

1. **Better Structure**: Modular architecture with clear separation of concerns
2. **Type Safety**: Decorators and dependency injection provide better TypeScript support
3. **Built-in Features**: Authentication, validation, serialization out of the box
4. **Scalability**: Easier to add new features and maintain large codebases
5. **Testing**: Better support for unit and integration testing
6. **Documentation**: OpenAPI/Swagger support (can be added easily)
7. **Microservices**: Easy to convert to microservices architecture if needed

## Next Steps

1. **Gradual Migration**: Start using the NestJS version in development
2. **Add Swagger**: Document APIs with OpenAPI
3. **Enhanced Testing**: Add NestJS-specific tests
4. **Performance Tuning**: Optimize for NestJS patterns
5. **Remove Express**: Once confident, remove Express files

## Troubleshooting

### Port Already in Use
If you get a port conflict, make sure you're not running both Express and NestJS versions simultaneously, or change the port in `.env`.

### MongoDB Connection Issues
Both versions use the same MongoDB configuration. Check your `.env` file and ensure MongoDB is running.

### Build Errors
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build:nest
```

## Support

For issues or questions about the NestJS conversion:
1. Check this documentation
2. Review the NestJS official documentation: https://docs.nestjs.com
3. Compare with the Express implementation for reference

## License

Same license as the original Express application (MIT).
