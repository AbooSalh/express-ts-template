# NestJS Application - Migration Complete

This application has been successfully migrated from Express.js to NestJS, preserving all functionality while leveraging NestJS's powerful features.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- MongoDB
- npm or pnpm

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

Required environment variables:
- `DB_URL` - MongoDB connection URL
- `DB_NAME` - Database name
- `JWT_SECRET` - Secret key for JWT tokens
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` - Email configuration

### Running the Application

```bash
# Development
npm run dev

# Production build
npm run build
npm run start
```

The API will be available at `http://localhost:5050/api/v1`

Health check: `http://localhost:5050/health`

## 📚 API Modules

### Authentication (`/api/v1/auth`)
- **POST** `/register` - Register new user (sends verification email)
- **POST** `/verify-email` - Verify email with code
- **POST** `/resend-email-verification-code` - Resend verification code
- **POST** `/login` - Login and get access/refresh tokens
- **POST** `/forgot-password` - Request password reset code
- **POST** `/resend-password-reset-code` - Resend reset code
- **POST** `/verify-reset-code` - Verify password reset code
- **POST** `/reset-password` - Reset password with verified code
- **POST** `/refresh-token` - Get new access token with refresh token
- **POST** `/logout` - Logout and invalidate refresh token
- **GET** `/sessions` - Get active sessions (requires auth)
- **DELETE** `/sessions/:id` - Revoke specific session (requires auth)

### Users (`/api/v1/users`)
- **GET** `/` - Get all users (admin only)
- **GET** `/profile` - Get current user profile (requires auth)
- **POST** `/` - Create user (admin only)
- **PUT** `/update` - Update current user (requires auth)
- **PATCH** `/change-password` - Change password (requires auth)
- **POST** `/send-delete-account-code` - Request account deletion code (requires auth)
- **DELETE** `/delete-account` - Delete account with code (requires auth)
- **GET** `/:id` - Get user by ID (admin only)
- **PUT** `/:id` - Update user (admin only)
- **DELETE** `/:id` - Delete user (admin only)

### Languages (`/api/v1/languages`)
- **GET** `/` - Get all languages (public)
- **GET** `/:id` - Get language by ID (public)
- **POST** `/` - Create language (admin only)
- **PUT** `/:id` - Update language (admin only)
- **DELETE** `/:id` - Delete language (admin only)

### Event Logs (`/api/v1/events`)
- **GET** `/` - Get event logs with filtering (admin only)
- **GET** `/analytics` - Get event analytics (admin only)

### Images (`/api/v1/images`)
- **GET** `/` - Get all images (public)
- **GET** `/:id` - Get image by ID (public)
- **POST** `/upload` - Upload image (admin only)
- **PUT** `/:id` - Update image metadata (admin only)
- **DELETE** `/:id` - Delete image (admin only)

### Monitoring (`/api/v1/monitoring`)
- **GET** `/health` - Health check (public)
- **GET** `/stats` - System stats (admin only)
- **GET** `/health-checks` - Get health check history (admin only)
- **GET** `/disk-usage` - Get disk usage data (admin only)
- **GET** `/backups` - Get backup logs (admin only)
- **POST** `/backups` - Create new backup (admin only)
- **GET** `/alerts` - Get alerts (admin only)
- **PUT** `/alerts/:id/resolve` - Resolve alert (admin only)
- **GET** `/system` - Get system info (admin only)
- **POST** `/reports/daily` - Trigger daily report (admin only)

## 🔐 Authentication

The API uses JWT-based authentication with refresh tokens:

1. **Register** and verify email
2. **Login** to receive access token and refresh token
3. Include access token in `Authorization: Bearer <token>` header
4. Use refresh token to get new access token when expired

### Session Management
- Multiple device sessions supported
- View and revoke active sessions
- Refresh tokens stored securely with device info

## 🎯 Key Features

### Security
- ✅ JWT authentication with Passport.js
- ✅ Role-based access control (user, admin)
- ✅ Email verification required for login
- ✅ Password reset with secure codes
- ✅ Rate limiting on all endpoints
- ✅ Request validation with class-validator
- ✅ CORS, Helmet, and MongoDB sanitization

### Email Flows
- Email verification on registration
- Password reset with secure codes
- Account deletion confirmation
- Resend codes for all flows

### File Management
- Image upload with Sharp processing
- Automatic variant generation (thumbnail, medium)
- Metadata support (alt, title, description, tags)

### Monitoring
- Health checks
- System statistics
- Disk usage monitoring (scheduled)
- Backup management
- Alert system

## 🏗️ Architecture

### Modules Structure
```
src/
├── modules/
│   ├── auth/          # Authentication logic
│   ├── user/          # User management
│   ├── language/      # Language CRUD
│   ├── event-log/     # Event tracking
│   ├── image/         # Image upload & processing
│   └── monitoring/    # System monitoring
├── common/
│   ├── decorators/    # Custom decorators (@Public, @Roles, @CurrentUser)
│   ├── filters/       # Exception filters
│   ├── guards/        # Auth & role guards
│   ├── interceptors/  # Logging interceptor
│   ├── services/      # Shared services (EmailService)
│   └── utils/         # Utilities
├── config/            # Configuration files
├── main.ts            # Application entry point
└── app.module.ts      # Root module
```

### Database
- **TypeORM** with MongoDB
- **Entities** for type-safe database operations
- **Indexes** for performance optimization

### Validation
- **class-validator** for DTO validation
- **Joi** for environment variable validation
- Automatic transformation and sanitization

## 🔧 Development

### Build
```bash
npm run build
```

### Format Code
```bash
npm run format
```

### Testing
```bash
npm run test
```

## 📦 Dependencies

### Core
- @nestjs/common, @nestjs/core, @nestjs/platform-express
- @nestjs/typeorm, typeorm, mongodb
- @nestjs/jwt, @nestjs/passport, passport, passport-jwt
- @nestjs/config, @nestjs/throttler, @nestjs/schedule

### Utilities
- class-validator, class-transformer
- joi (env validation)
- bcryptjs (password hashing)
- sharp (image processing)
- nodemailer (emails)

### Security
- helmet, compression, cors

## 🌟 Migration Benefits

This NestJS migration provides:

1. **Better Architecture** - Modular, testable, maintainable code
2. **Type Safety** - Full TypeScript support throughout
3. **Dependency Injection** - Loose coupling and easy testing
4. **Decorators** - Clean, declarative code
5. **Built-in Validation** - Type-safe DTOs with class-validator
6. **Better Error Handling** - Global exception filters
7. **Interceptors** - Request/response transformation and logging
8. **Guards** - Centralized authentication and authorization
9. **Swagger Support** - Easy API documentation (add @nestjs/swagger)
10. **Testing** - Built-in testing utilities

## 📝 Notes

- Old Express.js files have been removed
- All functionality has been preserved and improved
- Database schema remains compatible with existing data
- Rate limiting is applied globally with custom limits per endpoint
- Image uploads support variants (thumbnail, medium)
- Monitoring includes scheduled disk space checks every 5 minutes

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📄 License

MIT
