# Production Setup Guide

## Environment Variables

Before running the production Docker build, you need to set up your environment variables:

1. **Copy the environment template:**
   ```bash
   cp env.prod.example .env.prod
   ```

2. **Edit `.env.prod` with your actual values:**
   - Update `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` with your PostgreSQL credentials
   - Set secure `JWT_SECRET` and `JWT_REFRESH_SECRET` values (use random strings)
   - Configure email settings if using email functionality
   - Set API keys for OpenAI, Anthropic, Sentry as needed

## Running Production Build

Once your `.env.prod` file is configured:

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

## Security Notes

- Keep your `.env.prod` file secure and never commit it to version control
- Use strong, unique passwords for database credentials
- Generate random strings for JWT secrets (at least 32 characters)
- Configure CORS_ORIGIN to match your actual frontend domain

## Troubleshooting

If you encounter build issues:
1. Ensure all required environment variables are set in `.env.prod`
2. Check that Docker and Docker Compose are properly installed
3. Verify network connectivity for downloading dependencies
