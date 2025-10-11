# Express.js / NestJS TypeScript Template

This application provides **two implementation options**: the original **Express.js** version and a new **NestJS** version with identical functionality.

> **📖 For detailed NestJS migration guide, see [NESTJS_MIGRATION.md](./NESTJS_MIGRATION.md)**

## 🚀 Quick Start

### Choose Your Framework

#### Option 1: NestJS (Recommended for new projects)
```sh
# Development with hot-reload
npm run dev:nest

# Build for production
npm run build:nest

# Start production server
npm run start:nest
```

#### Option 2: Express.js (Original)
```sh
# Development with hot-reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## 🎯 Features

Both implementations include:

- **User Authentication & Authorization**
  - JWT-based authentication
  - Email verification
  - Password reset flow
  - Refresh token support
  - Session management
  - Role-based access control (admin, user, public)

- **User Management**
  - CRUD operations for users
  - Profile management
  - Account deletion with verification
  - Password change

- **Language Management**
  - Multi-language support
  - Language CRUD operations

- **Event Logging**
  - System event tracking
  - Analytics

- **Image Management**
  - File upload with multer
  - Image processing with sharp
  - Folder organization
  - Bulk operations
  - Translation support
  - Variant presets
  - Download as ZIP

- **System Monitoring**
  - Health checks
  - System statistics
  - Disk usage monitoring
  - Backup management
  - Alert system
  - Daily reports

- **Security Features**
  - Helmet security headers
  - MongoDB sanitization
  - HPP protection
  - CORS configuration
  - Rate limiting (global and endpoint-specific)
  - Input validation

- **Developer Experience**
  - TypeScript
  - Module aliasing (`@/` for `src/`)
  - Hot-reload in development
  - Comprehensive error handling
  - Request logging
  - Environment-based configuration

## 📌 Project Structure

```
express-ts-template/
├── src/
│   ├── app.module.ts                 # NestJS root module
│   ├── main.ts                       # NestJS bootstrap
│   ├── server.ts                     # Express bootstrap
│   ├── index.ts                      # Express routes
│   └── common/
│       ├── config/                   # Configuration files
│       ├── filters/                  # NestJS exception filters
│       ├── guards/                   # NestJS route guards
│       ├── middleware/               # Middleware (Express & NestJS)
│       ├── modules/                  # Feature modules
│       │   ├── User/
│       │   │   ├── auth/            # Authentication module
│       │   │   ├── model.ts         # Mongoose model
│       │   │   ├── *.controller.ts  # Express controller
│       │   │   ├── *.controller.nest.ts  # NestJS controller
│       │   │   ├── *.service.ts     # Express service
│       │   │   ├── *.service.nest.ts     # NestJS service
│       │   │   └── *.module.ts      # NestJS module
│       │   ├── Language/
│       │   ├── EventLog/
│       │   ├── Image/
│       │   └── Monitoring/
│       ├── utils/                   # Utility functions
│       ├── types/                   # TypeScript types
│       └── constants/               # Constants
├── .env                            # Environment variables
├── .env.example                    # Example environment variables
├── nest-cli.json                   # NestJS CLI configuration
├── tsconfig.json                   # TypeScript configuration
├── nodemon.json                    # Nodemon configuration
├── package.json
├── README.md                       # This file
└── NESTJS_MIGRATION.md            # Detailed NestJS guide
```

## 🛠 Installation & Setup

### 1️⃣ Clone the Repository

```sh
git clone <repo-url>
cd express-ts-template
```

### 2️⃣ Install Dependencies

```sh
npm install
# or
pnpm install
```

### 3️⃣ Configure Environment Variables

Copy the example environment file:

```sh
cp .env.example .env
```

Edit `.env` with your configuration:

```ini
# Server
NODE_ENV=development
PORT=5050
BASE_URL=http://localhost:5050

# Database
DB_URL=mongodb://localhost:27017
DB_NAME=your_database_name
DB_USER=
DB_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_ISSUER=your-app-name
JWT_AUDIENCE=your-app-users
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_NAME=Your App Name
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_SECURE=false

# CORS
CORS_ORIGIN=http://localhost:3000

# Security
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MINUTES=15
AUTH_RATE_LIMIT_MAX_REQUESTS=10
UPLOAD_RATE_LIMIT_WINDOW_MINUTES=60
UPLOAD_RATE_LIMIT_MAX_REQUESTS=20

# File Uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,webp,ico,svg

# Monitoring
ENABLE_MONITORING=true
UPLOADS_PATH=public/uploads
DISK_WARN_PCT=80
DISK_CRIT_PCT=90
```

### 4️⃣ Start MongoDB

Make sure MongoDB is running:

```sh
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or start your local MongoDB service
```

## 🚀 Available Scripts

### NestJS Version
```sh
npm run dev:nest        # Development with hot-reload
npm run build:nest      # Build for production
npm run start:nest      # Start production server
npm run start:prod      # Alternative production start
```

### Express Version
```sh
npm run dev            # Development with hot-reload
npm run build          # Build for production
npm run start          # Start production server
```

### Testing
```sh
npm test               # Run tests
```

## 📡 API Endpoints

All endpoints are prefixed with `/api/v1`. For a complete list of endpoints and their documentation, see [NESTJS_MIGRATION.md](./NESTJS_MIGRATION.md#converted-modules).

### Example Endpoints:
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/users/profile` - Get current user profile
- `GET /api/v1/images` - List images
- `GET /api/v1/monitoring/health` - Health check

## 🔒 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🧪 Testing

```sh
npm test
```

Tests work with both Express and NestJS versions since they share the same business logic and Mongoose models.

## 🛡 Security

- **Helmet**: Security headers
- **MongoDB Sanitization**: NoSQL injection prevention
- **HPP**: HTTP Parameter Pollution protection
- **CORS**: Cross-Origin Resource Sharing control
- **Rate Limiting**: Request throttling
- **Input Validation**: Request validation with class-validator (NestJS) or express-validator (Express)
- **JWT**: Secure token-based authentication
- **Bcrypt**: Password hashing

## 🤔 Which Version Should I Use?

### Use **NestJS** if:
- Starting a new project
- Building a large-scale application
- Need microservices in the future
- Want better TypeScript support
- Prefer dependency injection and modular architecture
- Want built-in OpenAPI/Swagger support

### Use **Express** if:
- Maintaining existing Express codebase
- Need maximum flexibility
- Prefer minimal abstractions
- Have team expertise in Express

**Note**: Both versions have identical functionality and can run side-by-side during migration.

## 📚 Documentation

- [NestJS Migration Guide](./NESTJS_MIGRATION.md) - Detailed guide for the NestJS implementation
- [Express Documentation](https://expressjs.com/)
- [NestJS Documentation](https://docs.nestjs.com/)

## 🛠 Tech Stack

### Common
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with Passport
- **Email**: Nodemailer
- **Image Processing**: Sharp
- **File Upload**: Multer
- **Logging**: Winston
- **Validation**: class-validator (NestJS) / express-validator (Express)

### NestJS-Specific
- **Framework**: NestJS
- **DI Container**: NestJS built-in
- **Modules**: @nestjs/mongoose, @nestjs/config, @nestjs/throttler

### Express-Specific
- **Framework**: Express.js
- **Security**: helmet, cors, hpp, express-mongo-sanitize
- **Rate Limiting**: express-rate-limit

## 🤝 Contributing

Feel free to fork, open issues, or submit pull requests! 😊

## 📄 License

MIT

## 👤 Author

Ahmed Saleh

---

**Need help?** See the [NestJS Migration Guide](./NESTJS_MIGRATION.md) for more details.
