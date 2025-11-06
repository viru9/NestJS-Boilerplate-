#!/bin/bash

# Backend Native Production Installation Script
# This script sets up the server environment for native deployment

set -e

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

log "Starting backend production environment setup"

# Update system packages
log "Updating system packages"
apt update && apt upgrade -y
success "System packages updated"

# Install Node.js (using NodeSource repository)
log "Installing Node.js"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    success "Node.js installed: $(node --version)"
else
    log "Node.js already installed: $(node --version)"
fi

# Install PM2 globally
log "Installing PM2"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    success "PM2 installed: $(pm2 --version)"
else
    log "PM2 already installed: $(pm2 --version)"
fi

# Install PostgreSQL
log "Installing PostgreSQL"
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    success "PostgreSQL installed and started"
else
    log "PostgreSQL already installed"
fi

# Install Redis
log "Installing Redis"
if ! command -v redis-server &> /dev/null; then
    apt install -y redis-server
    systemctl start redis-server
    systemctl enable redis-server
    success "Redis installed and started"
else
    log "Redis already installed"
fi

# Install Nginx (for reverse proxy)
log "Installing Nginx"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    success "Nginx installed and started"
else
    log "Nginx already installed"
fi

# Install additional tools
log "Installing additional tools"
apt install -y curl wget git htop nano certbot python3-certbot-nginx unzip
success "Additional tools installed"

# Configure firewall
log "Configuring firewall"
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 8000/tcp  # Backend API port
    success "Firewall configured"
else
    warning "UFW not available, skipping firewall configuration"
fi

# Create database and user
log "Setting up PostgreSQL database"
sudo -u postgres psql << EOF
CREATE DATABASE backend_prod;
CREATE USER backend_user WITH ENCRYPTED PASSWORD 'backend_password';
GRANT ALL PRIVILEGES ON DATABASE backend_prod TO backend_user;
ALTER USER backend_user CREATEDB;
\q
EOF
success "PostgreSQL database and user created"

# Configure Redis
log "Configuring Redis"
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup
sed -i 's/# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
sed -i 's/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
systemctl restart redis-server
success "Redis configured"

# Set up log rotation
log "Setting up log rotation"
cat > /etc/logrotate.d/backend << EOF
/opt/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 backend backend
    postrotate
        systemctl reload backend || true
    endscript
}
EOF
success "Log rotation configured"

# Create Nginx configuration
log "Creating Nginx configuration"
cat > /etc/nginx/sites-available/backend << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:8000/api/v1/health;
        access_log off;
    }
}
EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/backend /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
success "Nginx configuration created and enabled"

# Set up system limits
log "Configuring system limits"
cat >> /etc/security/limits.conf << EOF
backend soft nofile 65536
backend hard nofile 65536
backend soft nproc 32768
backend hard nproc 32768
EOF
success "System limits configured"

# Create PM2 startup script
log "Setting up PM2 startup"
sudo -u backend pm2 startup systemd -u backend --hp /opt/backend
success "PM2 startup configured"

success "Backend production environment setup completed!"
echo ""
log "Next steps:"
echo "1. Configure /opt/backend/.env with your production settings"
echo "2. Update Nginx configuration with your domain name"
echo "3. Set up SSL certificate: certbot --nginx -d your-domain.com"
echo "4. Deploy your application using ./deploy.sh"
echo "5. Start with PM2: pm2 start ecosystem.config.js --env production"
echo ""
warning "Remember to:"
echo "- Change default database passwords"
echo "- Configure proper JWT secrets"
echo "- Set up monitoring and alerting"
echo "- Configure backups"
