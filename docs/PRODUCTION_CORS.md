# Production CORS Configuration Guide

This guide explains how to configure CORS (Cross-Origin Resource Sharing) for production deployments of your NestJS backend.

## Overview

The backend uses environment variables to configure CORS settings, allowing flexibility for different deployment environments without code changes.

## Environment Variables

### Required CORS Variables

```env
# Frontend URL that will access your API
CORS_ORIGIN=https://your-frontend-domain.com

# Whether to allow credentials (cookies, authorization headers)
CORS_CREDENTIALS=true

# Optional: Frontend URL for email templates and redirects
FRONTEND_URL=https://your-frontend-domain.com

# Optional: API prefix (defaults to /api/v1)
API_PREFIX=/api/v1
```

## Common Production Scenarios

### Single Domain Setup

**Scenario**: Frontend and backend on different subdomains

**.env.production:**
```env
CORS_ORIGIN=https://app.yourdomain.com
CORS_CREDENTIALS=true
FRONTEND_URL=https://app.yourdomain.com
```

**Example URLs:**
- Frontend: `https://app.yourdomain.com`
- Backend: `https://api.yourdomain.com`

### Multiple Domain Setup

**Scenario**: Supporting multiple frontend domains (staging, production, etc.)

**.env.production:**
```env
# For multiple origins, you'll need to modify app.config.ts or use a proxy
CORS_ORIGIN=https://app.yourdomain.com,https://staging.yourdomain.com
CORS_CREDENTIALS=true
FRONTEND_URL=https://app.yourdomain.com
```

### Development + Production

**Scenario**: Allow both local development and production domains

**.env.production:**
```env
CORS_ORIGIN=https://app.yourdomain.com
CORS_CREDENTIALS=true
FRONTEND_URL=https://app.yourdomain.com
```

**.env.development:**
```env
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true
FRONTEND_URL=http://localhost:3000
```

## Docker Compose Configuration

The production `docker-compose.prod.yml` includes these CORS environment variables:

```yaml
environment:
  # CORS Configuration
  CORS_ORIGIN: ${CORS_ORIGIN:-https://yourdomain.com}
  CORS_CREDENTIALS: ${CORS_CREDENTIALS:-true}
  FRONTEND_URL: ${FRONTEND_URL:-https://yourdomain.com}
```

### Default Values

If environment variables are not set, the following defaults are used:
- `CORS_ORIGIN`: `https://yourdomain.com`
- `CORS_CREDENTIALS`: `true`
- `FRONTEND_URL`: `https://yourdomain.com`

## Deployment Steps

### 1. Create Production Environment File

Create `.env.production` in your deployment server:

```env
# Database
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=your_production_db

# JWT Secrets (generate secure keys)
JWT_SECRET=your-very-secure-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-very-secure-refresh-secret-min-32-chars

# CORS Configuration
CORS_ORIGIN=https://your-actual-frontend-domain.com
CORS_CREDENTIALS=true
FRONTEND_URL=https://your-actual-frontend-domain.com

# Optional: OpenAI, Email, Sentry
OPENAI_API_KEY=sk-...
EMAIL_HOST=smtp.your-provider.com
SENTRY_DSN=https://your-sentry-dsn
```

### 2. Deploy with Docker Compose

```bash
# Copy your environment file
cp .env.production .env

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs app
```

### 3. Verify CORS Configuration

Test the CORS configuration:

```bash
# Test preflight request
curl -X OPTIONS 'https://your-api-domain.com/api/v1/auth/login' \
  -H 'Origin: https://your-frontend-domain.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type' \
  -v

# Should return headers like:
# Access-Control-Allow-Origin: https://your-frontend-domain.com
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
# Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization
```

## Security Best Practices

### 1. Specific Origins Only

❌ **Don't use wildcards in production:**
```env
CORS_ORIGIN=*  # Insecure!
```

✅ **Use specific domains:**
```env
CORS_ORIGIN=https://app.yourdomain.com
```

### 2. HTTPS Only

❌ **Don't allow HTTP in production:**
```env
CORS_ORIGIN=http://app.yourdomain.com  # Insecure!
```

✅ **Use HTTPS:**
```env
CORS_ORIGIN=https://app.yourdomain.com
```

### 3. Credentials Handling

Only set `CORS_CREDENTIALS=true` if you need to send cookies or authorization headers:

```env
# If using JWT tokens in Authorization header
CORS_CREDENTIALS=true

# If only using public API
CORS_CREDENTIALS=false
```

## Advanced Configuration

### Multiple Origins Support

If you need to support multiple origins, modify `src/config/app.config.ts`:

```typescript
export default registerAs('app', () => ({
  // ... other config
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['https://yourdomain.com'],
  corsCredentials: process.env.CORS_CREDENTIALS === 'true',
}));
```

Then set multiple origins:
```env
CORS_ORIGIN=https://app.yourdomain.com,https://staging.yourdomain.com
```

### Dynamic CORS Configuration

For more complex scenarios, you can modify the CORS configuration in `src/main.ts`:

```typescript
// Dynamic CORS based on environment
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? [configService.get<string>('app.corsOrigin')]
  : ['http://localhost:3000', 'http://localhost:5173'];

app.enableCors({
  origin: corsOrigins,
  credentials: configService.get<boolean>('app.corsCredentials'),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200,
});
```

## Troubleshooting

### Common Issues

#### 1. CORS Error Still Occurs

**Check:**
- Environment variables are set correctly
- Container was restarted after changes
- Frontend is using the correct API URL
- Browser cache is cleared

**Debug:**
```bash
# Check container environment
docker-compose -f docker-compose.prod.yml exec app env | grep CORS

# Check application logs
docker-compose -f docker-compose.prod.yml logs app | grep -i cors
```

#### 2. Preflight Requests Failing

**Symptoms:** Browser shows CORS error on POST/PUT/DELETE requests

**Solution:** Verify OPTIONS method is allowed:
```bash
curl -X OPTIONS 'https://your-api.com/api/v1/auth/login' \
  -H 'Origin: https://your-frontend.com' \
  -v
```

#### 3. Credentials Not Working

**Check:**
- `CORS_CREDENTIALS=true` is set
- Frontend includes credentials in requests:
  ```javascript
  fetch('https://api.com/login', {
    method: 'POST',
    credentials: 'include', // Important!
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  ```

## Environment Variable Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CORS_ORIGIN` | Frontend domain(s) allowed to access API | `https://yourdomain.com` | ✅ |
| `CORS_CREDENTIALS` | Allow cookies/auth headers | `true` | ✅ |
| `FRONTEND_URL` | Frontend URL for emails/redirects | `https://yourdomain.com` | ✅ |
| `API_PREFIX` | API route prefix | `/api/v1` | ❌ |

## Next Steps

1. **Set up your domain**: Replace `yourdomain.com` with your actual domain
2. **Configure SSL**: Ensure your domain has valid SSL certificates
3. **Test thoroughly**: Verify all frontend-backend communication works
4. **Monitor**: Check logs for any CORS-related errors
5. **Document**: Record your specific configuration for your team

## Related Documentation

- [Deployment Guide](./DEPLOYMENT.md)
- [Frontend Integration](./FRONTEND_INTEGRATION.md)
- [Security Configuration](../SECURITY.md)
