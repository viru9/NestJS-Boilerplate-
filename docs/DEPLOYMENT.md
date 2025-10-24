# Deployment Guide

This guide covers deploying the NestJS backend application using Docker.

## Prerequisites

- Docker 20.10+
- Docker Compose 1.29+
- Git
- Domain name (for production)
- SSL certificate (for production)

## Quick Start with Docker Compose

### Development Environment

```bash
# Clone repository
git clone <repository-url>
cd backend

# Create environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start all services
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Seed database (optional)
docker-compose exec app npx prisma db seed

# View logs
docker-compose logs -f app
```

Access the application:
- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api-docs
- Prisma Studio: Run `docker-compose exec app npx prisma studio`

### Production Deployment

1. **Build production image:**
```bash
docker build -t backend-api:latest .
```

2. **Run with docker-compose:**
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d
```

3. **Run migrations:**
```bash
docker-compose exec app npx prisma migrate deploy
```

## Environment Configuration

### Required Environment Variables

```env
# Server
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-production-secret-min-64-chars
JWT_REFRESH_SECRET=your-production-refresh-secret-min-64-chars

# OpenAI
OPENAI_API_KEY=sk-...

# Email
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-secure-password

# Sentry
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production

# CORS
CORS_ORIGIN=https://your-frontend-domain.com
```

### Security Considerations

1. **Never commit .env files** - Use `.env.example` as template
2. **Use strong secrets** - Minimum 64 characters for production
3. **Enable HTTPS** - Always use SSL/TLS in production
4. **Restrict CORS** - Specify exact frontend domain
5. **Enable Sentry** - Track errors in production

## Docker Production Build

### Multi-stage Dockerfile

The included `Dockerfile` uses multi-stage builds for optimization:

**Stage 1: Dependencies**
- Installs production dependencies only
- Cleans npm cache

**Stage 2: Build**
- Installs all dependencies
- Generates Prisma client
- Builds TypeScript code

**Stage 3: Production**
- Runs as non-root user
- Includes only necessary files
- Minimal attack surface

### Build Commands

```bash
# Build image
docker build -t backend-api:v1.0.0 .

# Tag for registry
docker tag backend-api:v1.0.0 registry.example.com/backend-api:v1.0.0

# Push to registry
docker push registry.example.com/backend-api:v1.0.0
```

## Database Migrations

### Development

```bash
# Create migration
npx prisma migrate dev --name add_new_feature

# Apply migrations
npx prisma migrate dev
```

### Production

```bash
# Deploy migrations (no prompts)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

### Backup Before Migration

Always backup database before running migrations:

```bash
# PostgreSQL backup
docker-compose exec postgres pg_dump -U postgres backend_db > backup.sql

# Restore if needed
docker-compose exec -T postgres psql -U postgres backend_db < backup.sql
```

## Health Checks

The application includes health check endpoints:

```http
GET /api/v1/health
```

**Response:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "redis": {
      "status": "up"
    }
  }
}
```

Docker health check is configured:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', ...)"
```

## Monitoring & Logging

### Application Logs

```bash
# View logs
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app

# Save logs to file
docker-compose logs app > app-logs.txt
```

### Sentry Error Tracking

Configure Sentry in production:

```typescript
// Automatically configured via environment variables
SENTRY_DSN=your-dsn
SENTRY_ENVIRONMENT=production
SENTRY_TRACE_SAMPLE_RATE=1.0
```

### Log Files

Application logs are stored in:
- `/app/logs/error.log` - Error logs only
- `/app/logs/combined.log` - All logs

Mount volume to persist logs:
```yaml
volumes:
  - ./logs:/app/logs
```

## Scaling

### Horizontal Scaling

Run multiple application instances:

```yaml
# docker-compose.prod.yml
services:
  app:
    image: backend-api:latest
    deploy:
      replicas: 3
    # ... other config
```

### Load Balancing

Use nginx as reverse proxy:

```nginx
upstream backend {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Database Backup Strategy

### Automated Backups

```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U postgres backend_db > "backup_$DATE.sql"

# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

### Backup to S3

```bash
# Install AWS CLI in container
apt-get install awscli

# Backup and upload
pg_dump -U postgres backend_db | gzip | aws s3 cp - s3://bucket/backup.sql.gz
```

## SSL/TLS Configuration

### Using Let's Encrypt

```yaml
# docker-compose.prod.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

## Troubleshooting

### Application Won't Start

```bash
# Check logs
docker-compose logs app

# Common issues:
# - Database not ready
# - Missing environment variables
# - Port already in use
```

### Database Connection Failed

```bash
# Check database is running
docker-compose ps postgres

# Check connectivity
docker-compose exec app nc -zv postgres 5432

# Verify DATABASE_URL
docker-compose exec app printenv DATABASE_URL
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Limit memory in docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 512M
```

### Performance Issues

1. **Enable Redis caching**
2. **Add database indexes**
3. **Optimize Prisma queries**
4. **Enable compression**
5. **Use CDN for static assets**

## Rollback Strategy

### Quick Rollback

```bash
# Stop current version
docker-compose down

# Start previous version
docker-compose up -d --force-recreate --image backend-api:v0.9.0

# Rollback migrations if needed
npx prisma migrate resolve --rolled-back <migration-name>
```

### Zero-Downtime Deployment

```bash
# Start new version alongside old
docker-compose up -d --scale app=2

# Health check new instances
curl http://localhost:3001/api/v1/health

# Stop old instances
docker stop backend_app_1

# Remove old instances
docker rm backend_app_1
```

## Security Checklist

Before deploying to production:

- [ ] Environment variables are secure (not committed)
- [ ] JWT secrets are strong (64+ characters)
- [ ] HTTPS/SSL enabled
- [ ] CORS restricted to frontend domain
- [ ] Rate limiting configured
- [ ] Helmet middleware enabled
- [ ] Database credentials are strong
- [ ] Redis password set
- [ ] Sentry DSN configured
- [ ] File upload limits set
- [ ] Error messages don't leak sensitive info

## Performance Optimization

### Node.js Settings

```dockerfile
# In Dockerfile
ENV NODE_OPTIONS="--max-old-space-size=2048"
```

### Database Connection Pool

```env
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=20
```

### Redis Configuration

```yaml
redis:
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

## Monitoring Recommendations

1. **Application Performance**
   - New Relic / DataDog
   - Custom metrics to Prometheus

2. **Infrastructure**
   - Docker container metrics
   - Host system metrics

3. **Logs**
   - Centralized logging (ELK Stack)
   - Log aggregation

4. **Alerts**
   - High error rate
   - Database connection failures
   - Memory/CPU spikes
   - Response time degradation

## Support

For deployment issues:
- Check logs: `docker-compose logs`
- Review configuration
- Verify environment variables
- Consult NestJS documentation

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Production](https://docs.nestjs.com/)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

