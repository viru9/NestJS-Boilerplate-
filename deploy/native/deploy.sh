#!/bin/bash

# Backend Native Production Deployment Script
# Usage: ./deploy.sh [environment]

set -e

# Default environment
ENVIRONMENT=${1:-production}

# Configuration
APP_NAME="backend-api"
APP_USER="backend"
APP_GROUP="backend"
APP_DIR="/opt/backend"
SERVICE_NAME="backend"
SYSTEMD_SERVICE_PATH="/etc/systemd/system/backend.service"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"
    exit 1
}

# Check if running as root
if [[ $EUID != 0 ]]; then
    error "This script must be run as root (use sudo)"
fi

log "Starting backend deployment for environment: $ENVIRONMENT"

# Create application user if it doesn't exist
if ! id "$APP_USER" >/dev/null 2>&1; then
    log "Creating application user: $APP_USER"
    useradd --system --home-dir "$APP_DIR" --shell /bin/false --create-home "$APP_USER"
    success "Created user: $APP_USER"
else
    log "User $APP_USER already exists"
fi

# Create application directory
log "Setting up application directory: $APP_DIR"
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/logs"
mkdir -p "$APP_DIR/uploads"
mkdir -p "$APP_DIR/backups"

# Stop existing service if running
if systemctl is-active --quiet "$SERVICE_NAME"; then
    log "Stopping existing service"
    systemctl stop "$SERVICE_NAME"
fi

# Backup current deployment if it exists
if [ -d "$APP_DIR/dist" ]; then
    BACKUP_DIR="$APP_DIR/backups/backup-$(date +%Y%m%d-%H%M%S)"
    log "Creating backup: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    cp -r "$APP_DIR/dist" "$BACKUP_DIR/"
    cp "$APP_DIR/.env" "$BACKUP_DIR/" 2>/dev/null || true
    success "Created backup"
fi

# Copy application files
log "Copying application files"
if [ ! -f "dist/src/main.js" ]; then
    error "Built application not found. Run 'npm run build' first."
fi

cp -r dist/* "$APP_DIR/"
cp package*.json "$APP_DIR/"
success "Copied application files"

# Install production dependencies
log "Installing production dependencies"
cd "$APP_DIR"
npm ci --only=production --silent
success "Installed dependencies"

# Set up environment file
if [ ! -f "$APP_DIR/.env" ]; then
    log "Creating environment file from template"
    if [ -f "../../env.prod.example" ]; then
        cp "../../env.prod.example" "$APP_DIR/.env"
        warning "Environment file created from template. Please configure it before starting the service."
    else
        error "Environment template not found. Please create .env file manually."
    fi
else
    log "Environment file already exists"
fi

# Set permissions
log "Setting file permissions"
chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"
chmod 755 "$APP_DIR"
chmod 644 "$APP_DIR/.env"
chmod -R 755 "$APP_DIR/dist"
chmod -R 755 "$APP_DIR/logs"
chmod -R 755 "$APP_DIR/uploads"
success "Set file permissions"

# Install systemd service
log "Installing systemd service"
cp "../systemd/backend.service" "$SYSTEMD_SERVICE_PATH"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
success "Installed systemd service"

# Start service
log "Starting service"
systemctl start "$SERVICE_NAME"

# Check service status
sleep 5
if systemctl is-active --quiet "$SERVICE_NAME"; then
    success "Service started successfully"
    systemctl status "$SERVICE_NAME" --no-pager -l
else
    error "Service failed to start. Check logs: journalctl -u $SERVICE_NAME -f"
fi

# Run database migrations
log "Running database migrations"
sudo -u "$APP_USER" bash -c "cd $APP_DIR && npx prisma migrate deploy"
success "Database migrations completed"

success "Deployment completed successfully!"
log "Service status: systemctl status $SERVICE_NAME"
log "Service logs: journalctl -u $SERVICE_NAME -f"
log "Application logs: tail -f $APP_DIR/logs/app.log"
