#!/bin/bash

##############################################################################
# BabyBeats Server Initial Setup Script
# 
# This script automates the initial server setup for BabyBeats
# Run this on a fresh Ubuntu 22.04 server
# 
# Usage:
#   sudo bash setup-server.sh
#
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    error "Please run as root (use sudo)"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        BabyBeats Server Initial Setup Script              ║"
echo "║                  Ubuntu 22.04 LTS                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Confirm
warning "This script will configure your server for BabyBeats deployment."
read -p "Continue? (yes/no) " -r
echo
if [[ ! $REPLY = "yes" ]]; then
    info "Setup cancelled"
    exit 0
fi

##############################################################################
# System Update
##############################################################################

log "Updating system packages..."
apt update
apt upgrade -y
log "✓ System updated"

##############################################################################
# Install Essential Tools
##############################################################################

log "Installing essential tools..."
apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    net-tools \
    ufw \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

log "✓ Essential tools installed"

##############################################################################
# Create Application User
##############################################################################

log "Creating application user..."
APP_USER="babybeats"

if id "$APP_USER" &>/dev/null; then
    warning "User $APP_USER already exists, skipping creation"
else
    adduser --disabled-password --gecos "" $APP_USER
    usermod -aG sudo $APP_USER
    log "✓ User $APP_USER created"
    
    # Allow sudo without password for initial setup
    echo "$APP_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$APP_USER
    chmod 0440 /etc/sudoers.d/$APP_USER
fi

##############################################################################
# Install Docker
##############################################################################

log "Installing Docker..."

if command -v docker &> /dev/null; then
    warning "Docker already installed, skipping"
else
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    
    # Add Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add user to docker group
    usermod -aG docker $APP_USER
    
    # Enable Docker service
    systemctl enable docker
    systemctl start docker
    
    log "✓ Docker installed"
fi

##############################################################################
# Install Node.js (optional, for non-Docker deployment)
##############################################################################

log "Installing Node.js..."

if command -v node &> /dev/null; then
    warning "Node.js already installed ($(node --version)), skipping"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    
    log "✓ Node.js installed ($(node --version))"
fi

##############################################################################
# Install Nginx
##############################################################################

log "Installing Nginx..."

if command -v nginx &> /dev/null; then
    warning "Nginx already installed, skipping"
else
    apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
    
    log "✓ Nginx installed"
fi

##############################################################################
# Install Certbot (for SSL)
##############################################################################

log "Installing Certbot..."

if command -v certbot &> /dev/null; then
    warning "Certbot already installed, skipping"
else
    apt install -y certbot python3-certbot-nginx
    
    log "✓ Certbot installed"
fi

##############################################################################
# Configure Firewall (UFW)
##############################################################################

log "Configuring firewall..."

# Reset UFW to default
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (important!)
ufw allow 22/tcp comment 'SSH'

# Allow HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Enable UFW
ufw --force enable

log "✓ Firewall configured"

##############################################################################
# Configure SSH (Security)
##############################################################################

log "Configuring SSH security..."

SSH_CONFIG="/etc/ssh/sshd_config"

# Backup original config
cp $SSH_CONFIG ${SSH_CONFIG}.backup

# Apply security settings (but don't disable password auth yet)
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' $SSH_CONFIG
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' $SSH_CONFIG

# Restart SSH
systemctl restart sshd

log "✓ SSH configured"
warning "Root login disabled. Use $APP_USER for SSH access."

##############################################################################
# Setup Directory Structure
##############################################################################

log "Setting up directory structure..."

APP_DIR="/home/$APP_USER/BabyBeats"
BACKUP_DIR="/home/$APP_USER/backups"
LOG_DIR="/home/$APP_USER/logs"

mkdir -p $APP_DIR
mkdir -p $BACKUP_DIR
mkdir -p $LOG_DIR

chown -R $APP_USER:$APP_USER /home/$APP_USER

log "✓ Directory structure created"

##############################################################################
# Install Monitoring Tools
##############################################################################

log "Installing monitoring tools..."

# htop, iotop, nethogs
apt install -y htop iotop nethogs

log "✓ Monitoring tools installed"

##############################################################################
# Setup Automatic Security Updates
##############################################################################

log "Configuring automatic security updates..."

apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

log "✓ Automatic security updates enabled"

##############################################################################
# Install Fail2Ban (SSH protection)
##############################################################################

log "Installing Fail2Ban..."

if command -v fail2ban-client &> /dev/null; then
    warning "Fail2Ban already installed, skipping"
else
    apt install -y fail2ban
    
    # Create local config
    cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
EOF
    
    systemctl enable fail2ban
    systemctl start fail2ban
    
    log "✓ Fail2Ban installed and configured"
fi

##############################################################################
# Setup Swap (if needed)
##############################################################################

log "Checking swap space..."

if [ $(swapon --show | wc -l) -eq 0 ]; then
    warning "No swap space found, creating 2GB swap..."
    
    # Create swap file
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Make swap permanent
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    
    log "✓ Swap space created (2GB)"
else
    info "Swap space already exists"
fi

##############################################################################
# Create Deployment Scripts
##############################################################################

log "Creating helper scripts..."

# Health check script
cat > /home/$APP_USER/health-check.sh <<'EOF'
#!/bin/bash
echo "=== BabyBeats Health Check ==="
echo ""
echo "Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "API Health:"
curl -s http://localhost:3000/health | jq . || echo "API not responding"
echo ""
echo "Disk Usage:"
df -h | grep -E '^/dev/'
echo ""
echo "Memory Usage:"
free -h
echo ""
echo "Docker Stats:"
docker stats --no-stream
EOF

chmod +x /home/$APP_USER/health-check.sh
chown $APP_USER:$APP_USER /home/$APP_USER/health-check.sh

log "✓ Helper scripts created"

##############################################################################
# Final Information
##############################################################################

echo ""
log "═══════════════════════════════════════════════════════════"
log "🎉 Server setup completed successfully!"
log "═══════════════════════════════════════════════════════════"
echo ""

info "Server Information:"
echo "  • Application User: $APP_USER"
echo "  • Application Directory: $APP_DIR"
echo "  • Backup Directory: $BACKUP_DIR"
echo "  • Log Directory: $LOG_DIR"
echo ""

info "Installed Software:"
echo "  • Docker: $(docker --version)"
echo "  • Node.js: $(node --version)"
echo "  • Nginx: $(nginx -v 2>&1)"
echo "  • Certbot: $(certbot --version)"
echo ""

info "Next Steps:"
echo "  1. Switch to application user: su - $APP_USER"
echo "  2. Generate SSH key (if needed): ssh-keygen -t rsa -b 4096"
echo "  3. Clone repository: git clone <your-repo> $APP_DIR/backend"
echo "  4. Setup environment: cd $APP_DIR/backend && cp .env.example .env"
echo "  5. Edit .env file: nano $APP_DIR/backend/.env"
echo "  6. Deploy application: cd $APP_DIR/backend && ./deploy.sh"
echo ""

info "Security Reminders:"
echo "  ☐ Change default passwords in .env"
echo "  ☐ Generate strong JWT secret"
echo "  ☐ Configure domain and SSL certificate"
echo "  ☐ Setup SSH key authentication"
echo "  ☐ Disable password authentication in SSH (after key setup)"
echo "  ☐ Setup database backups"
echo ""

warning "Important: Reboot recommended to apply all changes"
read -p "Reboot now? (yes/no) " -r
echo
if [[ $REPLY = "yes" ]]; then
    log "Rebooting server..."
    reboot
fi

