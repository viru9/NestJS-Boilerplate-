#!/bin/sh
# Docker entrypoint script for NestJS backend
# Ensures Prisma client is generated before starting the application

set -e

echo "🚀 Starting NestJS Backend Container..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please ensure DATABASE_URL is provided at runtime"
    exit 1
fi

echo "✅ DATABASE_URL is configured"

# Generate Prisma client if needed (fallback)
echo "🔄 Ensuring Prisma client is generated..."
if [ ! -d "/app/node_modules/.prisma" ] || [ ! -f "/app/node_modules/.prisma/client/index.js" ]; then
    echo "📦 Generating Prisma client..."
    npx prisma generate
    echo "✅ Prisma client generated successfully"
else
    echo "✅ Prisma client already exists"
fi

# Run database migrations in development mode
if [ "$NODE_ENV" = "development" ]; then
    echo "🔄 Running database migrations (development mode)..."
    npx prisma migrate deploy || {
        echo "⚠️  Migration failed, but continuing startup..."
        echo "   This might be expected if database is not ready yet"
    }
fi

# Seed database if SEED_DATABASE is set to true
if [ "$SEED_DATABASE" = "true" ]; then
    echo "🌱 Seeding database..."
    npx prisma db seed || {
        echo "⚠️  Database seeding failed, but continuing startup..."
    }
fi

echo "🎯 Starting application with command: $@"

# Execute the main command
exec "$@"
