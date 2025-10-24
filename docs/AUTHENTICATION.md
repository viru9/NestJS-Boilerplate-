# Authentication Guide

This document explains how authentication works in this backend application.

## Overview

This backend uses **JWT (JSON Web Tokens)** for authentication with a refresh token mechanism for extended sessions.

### Authentication Flow

```
1. User registers/logs in
2. Server generates access token (15 minutes) + refresh token (7 days)
3. Client stores both tokens
4. Client includes access token in Authorization header for requests
5. When access token expires, client uses refresh token to get new tokens
6. On logout, refresh token is invalidated
```

## Endpoints

### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "USER"
  }
}
```

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response:** Same as register

### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** New access and refresh tokens

### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

### Forgot Password
```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If the email exists, a reset link has been sent"
}
```

### Reset Password
```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "NewPassword123!"
}
```

**Response:**
```json
{
  "message": "Password has been reset successfully"
}
```

## Using Authentication in Requests

### Making Authenticated Requests

Include the access token in the `Authorization` header:

```http
GET /api/v1/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiry Handling

**Access Token:** Expires in 15 minutes
**Refresh Token:** Expires in 7 days

When an access token expires:

1. Client receives `401 Unauthorized`
2. Client sends refresh token to `/auth/refresh`
3. Server returns new access + refresh tokens
4. Client retries original request with new access token

### Example Client Implementation (JavaScript)

```javascript
class AuthService {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  async login(email, password) {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async refreshAccessToken() {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    const data = await response.json();
    this.setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  }

  async request(url, options = {}) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.accessToken}`,
    };

    let response = await fetch(url, options);

    // If unauthorized, try refreshing token
    if (response.status === 401) {
      await this.refreshAccessToken();
      
      // Retry original request with new token
      options.headers['Authorization'] = `Bearer ${this.accessToken}`;
      response = await fetch(url, options);
    }

    return response;
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.accessToken = null;
    this.refreshToken = null;
  }
}
```

## Password Requirements

Passwords must meet the following criteria:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number or special character

## Security Best Practices

### For Backend Developers

1. **Never log tokens** - Keep JWT secrets secure
2. **Use HTTPS** - Always transmit tokens over HTTPS in production
3. **Short-lived access tokens** - 15 minutes is recommended
4. **Rotate refresh tokens** - Generate new refresh token on each refresh
5. **Store refresh tokens securely** - Database with expiry tracking
6. **Implement rate limiting** - Prevent brute force attacks
7. **Hash passwords** - Use bcrypt with adequate salt rounds (10+)

### For Frontend Developers

1. **Store tokens securely** - Use httpOnly cookies or secure storage
2. **Don't expose tokens** - Never log tokens to console
3. **Handle token expiry** - Implement automatic token refresh
4. **Clear tokens on logout** - Remove all authentication data
5. **Use HTTPS** - Never send credentials over HTTP

## Role-Based Access Control (RBAC)

### Available Roles

- `USER` - Regular user (default)
- `PREMIUM` - Premium user with extended features
- `ADMIN` - Administrator with full access

### Protecting Endpoints by Role

```typescript
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Roles(Role.ADMIN)
@Get('admin')
async getAdminData() {
  return 'Admin only data';
}

@Roles(Role.ADMIN, Role.PREMIUM)
@Get('premium-content')
async getPremiumContent() {
  return 'Premium or Admin can access';
}
```

### Public Endpoints

Use `@Public()` decorator to bypass authentication:

```typescript
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Get('public')
async getPublicData() {
  return 'Anyone can access this';
}
```

## Getting Current User

Use the `@CurrentUser()` decorator to access authenticated user data:

```typescript
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Get('profile')
async getProfile(@CurrentUser() user) {
  // user contains: { id, email, firstName, lastName, role }
  return user;
}

// Get specific field
@Get('posts')
async getPosts(@CurrentUser('id') userId: string) {
  return this.postsService.findByUser(userId);
}
```

## JWT Payload Structure

### Access Token Payload

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234568790
}
```

### Refresh Token Payload

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1235172690
}
```

## Token Storage in Database

Refresh tokens are stored in the `refresh_tokens` table:

```sql
id          UUID PRIMARY KEY
token       TEXT UNIQUE NOT NULL
userId      UUID REFERENCES users(id)
expiresAt   TIMESTAMP NOT NULL
createdAt   TIMESTAMP DEFAULT NOW()
```

## Common Issues & Solutions

### 401 Unauthorized

**Cause:** Token missing, invalid, or expired

**Solution:**
- Ensure token is included in Authorization header
- Check token format: `Bearer <token>`
- Refresh token if expired

### 403 Forbidden

**Cause:** User doesn't have required role

**Solution:**
- Check user role matches endpoint requirements
- Contact admin to upgrade user role if needed

### Token Expired

**Cause:** Access token exceeded 15-minute lifespan

**Solution:**
- Use refresh token to get new access token
- Implement automatic token refresh in client

### Invalid Refresh Token

**Cause:** Refresh token expired or invalidated

**Solution:**
- User must log in again
- Redirect to login page

## Testing Authentication

### Using cURL

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!"}'

# Use token
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Postman/Thunder Client

1. Create environment variables:
   - `baseUrl`: http://localhost:3000/api/v1
   - `accessToken`: (will be set automatically)
   - `refreshToken`: (will be set automatically)

2. In login request, add script to save tokens:
```javascript
pm.environment.set("accessToken", pm.response.json().accessToken);
pm.environment.set("refreshToken", pm.response.json().refreshToken);
```

3. Use `{{accessToken}}` in Authorization header

## Development Credentials

After running `npm run prisma:seed`, use these test accounts:

```
Admin:
- Email: admin@example.com
- Password: Admin123!

Regular User:
- Email: user@example.com
- Password: User123!

Premium User:
- Email: premium@example.com
- Password: Premium123!
```

## Environment Variables

Required environment variables for authentication:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_REFRESH_EXPIRES_IN=7d
```

## Further Reading

- [JWT.io](https://jwt.io/) - JWT debugger and documentation
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Passport.js Documentation](http://www.passportjs.org/docs/)
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)

