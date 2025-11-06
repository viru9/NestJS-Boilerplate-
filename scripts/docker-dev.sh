#!/bin/bash

# Backend Docker Development Script
# This script ensures clean container startup with proper rebuild

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✓ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ✗ $1${NC}"
    exit 1
}

log "Starting Backend Docker Development Environment"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    error "Docker is not running. Please start Docker and try again."
fi

# Step 1: Stop and remove existing containers
log "Stopping existing containers..."
if docker-compose ps -q | grep -q .; then
    docker-compose down
    success "Existing containers stopped"
else
    log "No existing containers to stop"
fi

# Step 2: Force rebuild without cache
log "Building fresh images (this may take a few minutes)..."
if docker-compose build --no-cache; then
    success "Images built successfully"
else
    error "Failed to build images"
fi

# Step 3: Start containers
log "Starting containers..."
if docker-compose up -d; then
    success "Containers started successfully"
else
    error "Failed to start containers"
fi

# Step 4: Wait for services to be ready
log "Waiting for services to start..."
sleep 10

# Step 5: Check service health
log "Checking service status..."

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    success "Containers are running"
else
    error "Some containers failed to start"
fi

# Check backend health
log "Testing backend health..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/v1/health >/dev/null 2>&1; then
        success "Backend is responding at http://localhost:3000"
        break
    fi
    if [ $i -eq 30 ]; then
        warning "Backend health check timed out, but containers are running"
        break
    fi
    sleep 2
done

# Show status
echo ""
log "=== Docker Development Environment Ready ==="
echo -e "${GREEN}Backend API:${NC} http://localhost:3000"
echo -e "${GREEN}API Health:${NC} http://localhost:3000/api/v1/health"
echo -e "${GREEN}Swagger Docs:${NC} http://localhost:3000/api/v1/docs"
echo ""
log "Useful commands:"
echo "  npm run docker:logs    - View logs"
echo "  npm run docker:down    - Stop containers"
echo "  docker-compose ps      - Check status"
