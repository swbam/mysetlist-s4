#!/bin/bash

# MySetlist Production Deployment Script
# SUB-AGENT 6: Production Deployment Implementation

set -e

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENVIRONMENT="${1:-staging}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/mysetlist_backup_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Starting pre-deployment checks..."
    
    # Check Node.js version
    if ! node --version | grep -E "v(18|20|21)" > /dev/null; then
        error "Node.js version must be 18, 20, or 21"
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        error "pnpm is required but not installed"
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is required but not installed"
    fi
    
    # Check environment variables
    if [[ "$ENVIRONMENT" == "production" ]]; then
        required_vars=(
            "DATABASE_URL"
            "NEXT_PUBLIC_SUPABASE_URL"
            "NEXT_PUBLIC_SUPABASE_ANON_KEY"
            "SUPABASE_SERVICE_ROLE_KEY"
            "NEXT_PUBLIC_SENTRY_DSN"
            "SENTRY_AUTH_TOKEN"
        )
        
        for var in "${required_vars[@]}"; do
            if [[ -z "${!var}" ]]; then
                error "Required environment variable $var is not set"
            fi
        done
    fi
    
    log "Pre-deployment checks completed successfully"
}

# TypeScript check
typescript_check() {
    log "Running TypeScript checks..."
    
    cd "$PROJECT_ROOT"
    
    if ! pnpm typecheck; then
        error "TypeScript check failed. Please fix all TypeScript errors before deployment."
    fi
    
    log "TypeScript checks completed successfully"
}

# Security scan
security_scan() {
    log "Running security scan..."
    
    cd "$PROJECT_ROOT"
    
    # Run npm audit
    if ! npm audit --audit-level=high --production; then
        warn "npm audit found vulnerabilities. Please review and fix if critical."
    fi
    
    # Run Trivy scan if available
    if command -v trivy &> /dev/null; then
        if ! trivy fs . --exit-code 1 --severity HIGH,CRITICAL; then
            error "Critical security vulnerabilities found. Please fix before deployment."
        fi
    else
        warn "Trivy not available. Skipping container security scan."
    fi
    
    log "Security scan completed"
}

# Build application
build_application() {
    log "Building application..."
    
    cd "$PROJECT_ROOT"
    
    # Clean previous builds
    rm -rf apps/web/.next
    rm -rf .turbo
    
    # Install dependencies
    if ! pnpm install --frozen-lockfile; then
        error "Failed to install dependencies"
    fi
    
    # Build with bundle analysis
    if [[ "$ENVIRONMENT" == "production" ]]; then
        ANALYZE=true pnpm build
    else
        pnpm build
    fi
    
    log "Application built successfully"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run unit tests
    if ! pnpm test; then
        error "Unit tests failed"
    fi
    
    # Run E2E tests for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if ! pnpm test:e2e; then
            error "E2E tests failed"
        fi
    fi
    
    log "Tests completed successfully"
}

# Database migration
database_migration() {
    log "Running database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Create backup before migration
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "Creating database backup..."
        mkdir -p "$BACKUP_DIR"
        pg_dump "$DATABASE_URL" > "$BACKUP_DIR/database_backup.sql"
        log "Database backup created at $BACKUP_DIR/database_backup.sql"
    fi
    
    # Run migrations
    if ! pnpm db:migrate; then
        error "Database migration failed"
    fi
    
    log "Database migrations completed successfully"
}

# Deploy to Vercel
deploy_vercel() {
    log "Deploying to Vercel..."
    
    cd "$PROJECT_ROOT"
    
    # Set deployment command based on environment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        DEPLOY_CMD="vercel --prod --yes"
    else
        DEPLOY_CMD="vercel --yes"
    fi
    
    # Deploy
    if ! $DEPLOY_CMD; then
        error "Vercel deployment failed"
    fi
    
    log "Vercel deployment completed successfully"
}

# Deploy with Docker
deploy_docker() {
    log "Deploying with Docker..."
    
    cd "$PROJECT_ROOT"
    
    # Build Docker image
    if ! docker build -t mysetlist:$TIMESTAMP .; then
        error "Docker build failed"
    fi
    
    # Tag for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        docker tag mysetlist:$TIMESTAMP mysetlist:production
        docker tag mysetlist:$TIMESTAMP mysetlist:latest
    fi
    
    # Deploy with docker-compose
    if [[ "$ENVIRONMENT" == "production" ]]; then
        ENV_FILE=".env.production"
    else
        ENV_FILE=".env.local"
    fi
    
    if ! docker-compose --env-file "$ENV_FILE" up -d; then
        error "Docker deployment failed"
    fi
    
    log "Docker deployment completed successfully"
}

# Health check
health_check() {
    log "Performing health check..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        HEALTH_URL="https://mysetlist.app/api/health"
    else
        HEALTH_URL="http://localhost:3001/api/health"
    fi
    
    # Wait for application to start
    sleep 30
    
    # Check health endpoint
    for i in {1..30}; do
        if curl -f "$HEALTH_URL" > /dev/null 2>&1; then
            log "Health check passed"
            return 0
        fi
        
        log "Health check attempt $i failed, retrying in 10 seconds..."
        sleep 10
    done
    
    error "Health check failed after 30 attempts"
}

# Performance validation
performance_validation() {
    log "Running performance validation..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        TARGET_URL="https://mysetlist.app"
    else
        TARGET_URL="http://localhost:3001"
    fi
    
    # Run Lighthouse if available
    if command -v lighthouse &> /dev/null; then
        if ! lighthouse "$TARGET_URL" --output=json --output-path=./lighthouse-results.json --chrome-flags="--headless"; then
            warn "Lighthouse performance test failed"
        else
            log "Lighthouse performance test completed"
        fi
    else
        warn "Lighthouse not available. Skipping performance validation."
    fi
}

# Rollback function
rollback() {
    log "Initiating rollback..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        # Rollback Vercel deployment
        if command -v vercel &> /dev/null; then
            vercel rollback --yes
        fi
        
        # Restore database backup if exists
        if [[ -f "$BACKUP_DIR/database_backup.sql" ]]; then
            log "Restoring database backup..."
            psql "$DATABASE_URL" < "$BACKUP_DIR/database_backup.sql"
            log "Database restored from backup"
        fi
    fi
    
    log "Rollback completed"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    
    # Remove backup directory if deployment succeeded
    if [[ -d "$BACKUP_DIR" ]]; then
        rm -rf "$BACKUP_DIR"
    fi
    
    log "Cleanup completed"
}

# Notification function
send_notification() {
    local status=$1
    local message=$2
    
    # Send Slack notification if webhook URL is set
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 MySetlist Deployment $status: $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    log "Notification sent: $status - $message"
}

# Main deployment function
main() {
    log "Starting MySetlist deployment to $ENVIRONMENT..."
    
    # Trap for cleanup and rollback on error
    trap 'error "Deployment failed. Initiating rollback..."; rollback; exit 1' ERR
    
    # Run deployment steps
    pre_deployment_checks
    typescript_check
    security_scan
    build_application
    run_tests
    database_migration
    
    # Deploy based on environment
    if [[ "$ENVIRONMENT" == "production" ]] && [[ "$DEPLOY_METHOD" == "docker" ]]; then
        deploy_docker
    else
        deploy_vercel
    fi
    
    health_check
    performance_validation
    cleanup
    
    log "Deployment to $ENVIRONMENT completed successfully!"
    send_notification "SUCCESS" "Deployment to $ENVIRONMENT completed successfully"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi