# Security Guidelines for Docker Deployment

## Environment Variables

### Development
- Use `.env.example` as a template to create your `.env` file
- Never commit `.env` files to version control
- Use default development secrets only for local development

### Production
- **NEVER** use default or hardcoded secrets in production
- Use the `scripts/generate-secrets.sh` script to generate secure secrets
- Use environment-specific secret management systems:
  - AWS Secrets Manager
  - Azure Key Vault
  - HashiCorp Vault
  - Kubernetes Secrets

## Docker Security Best Practices

### 1. Non-Root User
✅ Both Dockerfiles run as non-root users
- Backend: `nestjs` user (UID 1001)
- Frontend: `nginx` user (default)

### 2. Minimal Base Images
✅ Using Alpine Linux images for smaller attack surface
- `node:20-alpine`
- `nginx:alpine`
- `postgres:15-alpine`
- `redis:7-alpine`

### 3. Multi-Stage Builds
✅ Production images use multi-stage builds to minimize final image size

### 4. Health Checks
✅ All services have proper health checks implemented

## Required Security Environment Variables

### Backend Production
```bash
# Required - Generate with scripts/generate-secrets.sh
JWT_SECRET=your-secure-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-secure-refresh-secret-min-32-chars
POSTGRES_PASSWORD=your-secure-db-password

# Optional but recommended
SENTRY_DSN=your-sentry-dsn-for-error-monitoring
```

### Database Security
- Use strong passwords (generated, not human-created)
- Enable SSL connections in production
- Restrict database access to application containers only
- Use database-specific users with minimal required permissions

## Network Security
- Services communicate through dedicated Docker networks
- Only necessary ports are exposed to the host
- Use reverse proxy (nginx) for HTTPS termination

## Secrets Management Commands

```bash
# Generate production secrets
./scripts/generate-secrets.sh

# For production deployment with secrets
docker-compose -f docker-compose.prod.yml up -d

# Verify no default secrets are used
docker-compose -f docker-compose.prod.yml config | grep -E "(password|secret|key)"
```

## Security Scanning

Run security scans on your images:
```bash
# Scan backend image
docker scout cves backend-api:latest

# Scan frontend image  
docker scout cves frontend-app:latest
```

## Additional Recommendations

1. **Enable Docker Content Trust** for image verification
2. **Use .dockerignore** to prevent sensitive files from being copied
3. **Regularly update base images** for security patches
4. **Monitor containers** with proper logging and alerting
5. **Use secrets management** instead of environment variables for sensitive data
6. **Enable audit logging** for production environments
