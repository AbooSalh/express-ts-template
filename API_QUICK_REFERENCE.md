# API Quick Reference

Base URL: `http://localhost:5050/api/v1`

## Authentication

### Register
```bash
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Verify Email
```bash
POST /auth/verify-email
Content-Type: application/json

{
  "email": "john@example.com",
  "code": "ABC123XYZ456"
}
```

### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

Response:
{
  "user": {...},
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

### Refresh Token
```bash
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJ..."
}
```

### Forgot Password
```bash
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

### Verify Reset Code
```bash
POST /auth/verify-reset-code
Content-Type: application/json

{
  "email": "john@example.com",
  "code": "ABC123XYZ456"
}
```

### Reset Password
```bash
POST /auth/reset-password
Content-Type: application/json

{
  "email": "john@example.com",
  "newPassword": "newpassword123"
}
```

## Users

### Get Profile (authenticated)
```bash
GET /users/profile
Authorization: Bearer <accessToken>
```

### Update Profile (authenticated)
```bash
PUT /users/update
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "John Updated"
}
```

### Change Password (authenticated)
```bash
PATCH /users/change-password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

### Get All Users (admin only)
```bash
GET /users
Authorization: Bearer <adminAccessToken>
```

### Create User (admin only)
```bash
POST /users
Authorization: Bearer <adminAccessToken>
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123",
  "role": "user"
}
```

## Languages

### Get All Languages (public)
```bash
GET /languages
```

### Get Language by ID (public)
```bash
GET /languages/:id
```

### Create Language (admin only)
```bash
POST /languages
Authorization: Bearer <adminAccessToken>
Content-Type: application/json

{
  "code": "en",
  "name": "English",
  "isDefault": true
}
```

### Update Language (admin only)
```bash
PUT /languages/:id
Authorization: Bearer <adminAccessToken>
Content-Type: application/json

{
  "name": "English (US)",
  "isDefault": false
}
```

## Images

### Get All Images (public)
```bash
GET /images?page=1&limit=20&folder=products
```

### Upload Image (admin only)
```bash
POST /images/upload
Authorization: Bearer <adminAccessToken>
Content-Type: multipart/form-data

file: <image file>
folder: "products"
alt: "Product image"
title: "My Product"
description: "A beautiful product"
tags: ["product", "new"]
```

### Update Image Metadata (admin only)
```bash
PUT /images/:id
Authorization: Bearer <adminAccessToken>
Content-Type: application/json

{
  "alt": "Updated alt text",
  "title": "Updated title",
  "tags": ["updated", "tags"]
}
```

### Delete Image (admin only)
```bash
DELETE /images/:id
Authorization: Bearer <adminAccessToken>
```

## Event Logs

### Get Event Logs (admin only)
```bash
GET /events?page=1&limit=50&refModel=Tour&type=view
Authorization: Bearer <adminAccessToken>
```

### Get Analytics (admin only)
```bash
GET /events/analytics?model=Tour&type=view
Authorization: Bearer <adminAccessToken>
```

## Monitoring

### Health Check (public)
```bash
GET /monitoring/health
GET /health (alternative)
```

### Get System Stats (admin only)
```bash
GET /monitoring/stats
Authorization: Bearer <adminAccessToken>
```

### Get Disk Usage (admin only)
```bash
GET /monitoring/disk-usage
Authorization: Bearer <adminAccessToken>
```

### Get Backups (admin only)
```bash
GET /monitoring/backups
Authorization: Bearer <adminAccessToken>
```

### Create Backup (admin only)
```bash
POST /monitoring/backups
Authorization: Bearer <adminAccessToken>
```

### Get Alerts (admin only)
```bash
GET /monitoring/alerts?resolved=false
Authorization: Bearer <adminAccessToken>
```

### Resolve Alert (admin only)
```bash
PUT /monitoring/alerts/:id/resolve
Authorization: Bearer <adminAccessToken>
```

### Get System Info (admin only)
```bash
GET /monitoring/system
Authorization: Bearer <adminAccessToken>
```

## Rate Limits

- **General API**: 100 requests per minute
- **Auth endpoints**: 10 requests per 15 minutes
- **Upload endpoints**: 20 requests per hour

## Error Responses

All errors follow this format:
```json
{
  "statusCode": 400,
  "timestamp": "2025-10-11T13:00:00.000Z",
  "path": "/api/v1/auth/login",
  "message": ["Email is required", "Password is required"]
}
```

## Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Testing with cURL

### Register and Login Flow
```bash
# 1. Register
curl -X POST http://localhost:5050/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123"}'

# 2. Verify Email (check your email for code)
curl -X POST http://localhost:5050/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"YOUR_CODE"}'

# 3. Login
curl -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 4. Get Profile (use token from login response)
curl -X GET http://localhost:5050/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Environment Setup

Create a `.env` file:
```env
NODE_ENV=development
PORT=5050
BASE_URL=http://localhost:5050

DB_URL=mongodb://localhost:27017
DB_NAME=your_database

JWT_SECRET=your-secret-key-change-this
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASSWORD=your-mailtrap-password
SMTP_FROM_NAME=Your App Name
SMTP_FROM_EMAIL=noreply@example.com

CORS_ORIGIN=http://localhost:3000
```

## Start the Application

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production
npm run start
```

## Notes

- All authenticated endpoints require `Authorization: Bearer <token>` header
- Admin-only endpoints require a user with `role: "admin"`
- Email verification is required before login
- Refresh tokens are valid for 7 days
- Access tokens expire after 1 day
- Rate limits apply per IP address
- File uploads are limited to 10MB
