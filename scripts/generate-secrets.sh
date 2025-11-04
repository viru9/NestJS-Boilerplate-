#!/bin/bash
# Script to generate secure secrets for production

echo "Generating secure secrets for backend..."

# Generate JWT secrets (32+ characters)
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)

# Generate database password
DB_PASSWORD=$(openssl rand -base64 32)

echo "Generated secrets (save these securely):"
echo "=================================="
echo "JWT_SECRET=${JWT_SECRET}"
echo "JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}"
echo "POSTGRES_PASSWORD=${DB_PASSWORD}"
echo "=================================="
echo ""
echo "Create a .env file with these values:"
echo "cp .env.example .env"
echo "# Then update .env with the generated secrets above"
echo ""
echo "For production, use a proper secret management system!"
