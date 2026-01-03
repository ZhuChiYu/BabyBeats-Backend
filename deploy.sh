#!/bin/bash

##############################################################################
# BabyBeats Backend Deployment Script
# 
# This script automates the deployment process for BabyBeats backend
# 
# Usage:
#   ./deploy.sh [environment]
#
# Environments:
#   dev        - Development environment
#   staging    - Staging environment  
#   production - Production environment (default)
#
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment (default to production)
ENV=${1:-production}

# Configuration
PROJECT_NAME="babybeats"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$HOME/backups"
LOG_FILE="$SCRIPT_DIR/deploy.log"

##############################################################################
# Functions
##############################################################################

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command_exists docker; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    if ! command_exists git; then
        warning "Git is not installed. Some features may not work."
    fi
    
    log "✓ Prerequisites check passed"
}

# Check environment file
check_env_file() {
    log "Checking environment configuration..."
    
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        error ".env file not found! Please create .env file first.\nYou can copy from .env.example if available."
    fi
    
    # Check for required environment variables
    source "$SCRIPT_DIR/.env"
    
    local required_vars=("DB_USER" "DB_PASSWORD" "JWT_SECRET")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        error "Missing required environment variables: ${missing_vars[*]}"
    fi
    
    # Check for default/weak passwords
    if [ "$DB_PASSWORD" = "postgres" ] || [ "$JWT_SECRET" = "your-secret-key-change-in-production" ]; then
        warning "You are using default passwords! Please change them in .env file."
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log "✓ Environment configuration check passed"
}

# Backup database
backup_database() {
    if [ "$ENV" = "production" ]; then
        log "Creating database backup..."
        
        mkdir -p "$BACKUP_DIR"
        
        local backup_file="$BACKUP_DIR/${PROJECT_NAME}_$(date +%Y%m%d_%H%M%S).sql.gz"
        
        if docker ps | grep -q "${PROJECT_NAME}-postgres"; then
            docker exec "${PROJECT_NAME}-postgres" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$backup_file"
            log "✓ Database backup created: $backup_file"
        else
            warning "Database container not running, skipping backup"
        fi
    fi
}

# Pull latest code
pull_latest_code() {
    log "Pulling latest code..."
    
    if command_exists git && [ -d "$SCRIPT_DIR/.git" ]; then
        cd "$SCRIPT_DIR"
        git pull origin main || warning "Failed to pull latest code"
        log "✓ Code updated"
    else
        warning "Not a git repository, skipping code update"
    fi
}

# Build and start services
deploy_services() {
    log "Deploying services..."
    
    cd "$SCRIPT_DIR"
    
    # Stop existing services
    log "Stopping existing services..."
    docker compose down || true
    
    # Build images
    log "Building Docker images..."
    docker compose build --no-cache
    
    # Start services
    log "Starting services..."
    docker compose up -d
    
    log "✓ Services deployed"
}

# Wait for services to be healthy
wait_for_services() {
    log "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker compose ps | grep -q "healthy"; then
            log "✓ Services are healthy"
            return 0
        fi
        
        attempt=$((attempt + 1))
        info "Waiting for services... ($attempt/$max_attempts)"
        sleep 2
    done
    
    error "Services failed to become healthy after $max_attempts attempts"
}

# Test deployment
test_deployment() {
    log "Testing deployment..."
    
    local api_url="http://localhost:3000/health"
    
    # Wait a bit for services to fully start
    sleep 5
    
    if command_exists curl; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" "$api_url")
        
        if [ "$response" = "200" ]; then
            log "✓ Health check passed"
        else
            error "Health check failed (HTTP $response)"
        fi
    else
        warning "curl not installed, skipping health check"
    fi
}

# Show service status
show_status() {
    log "Service status:"
    docker compose ps
    
    log "\nService logs (last 20 lines):"
    docker compose logs --tail=20
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old Docker resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused volumes (be careful with this in production)
    if [ "$ENV" != "production" ]; then
        docker volume prune -f
    fi
    
    log "✓ Cleanup completed"
}

# Main deployment flow
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          BabyBeats Backend Deployment Script              ║"
    echo "║                    Environment: $ENV                     ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Confirm production deployment
    if [ "$ENV" = "production" ]; then
        warning "You are deploying to PRODUCTION environment!"
        read -p "Are you sure you want to continue? (yes/no) " -r
        echo
        if [[ ! $REPLY = "yes" ]]; then
            info "Deployment cancelled"
            exit 0
        fi
    fi
    
    log "Starting deployment process..."
    
    # Run deployment steps
    check_prerequisites
    check_env_file
    backup_database
    pull_latest_code
    deploy_services
    wait_for_services
    test_deployment
    cleanup
    show_status
    
    echo ""
    log "═══════════════════════════════════════════════════════════"
    log "🎉 Deployment completed successfully!"
    log "═══════════════════════════════════════════════════════════"
    echo ""
    
    info "Next steps:"
    echo "  1. Check service status: docker compose ps"
    echo "  2. View logs: docker compose logs -f"
    echo "  3. Test API: curl http://localhost:3000/health"
    echo ""
    
    if [ "$ENV" = "production" ]; then
        info "Production checklist:"
        echo "  ☐ Update frontend API URL"
        echo "  ☐ Test all endpoints"
        echo "  ☐ Monitor error logs"
        echo "  ☐ Set up backup schedule"
        echo ""
    fi
}

##############################################################################
# Script Entry Point
##############################################################################

# Trap errors
trap 'error "Deployment failed at line $LINENO"' ERR

# Run main function
main "$@"

