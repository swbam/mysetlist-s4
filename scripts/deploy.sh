#!/bin/bash

# MySetlist Deployment Script
# This script handles deployment to different environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENTS=("staging" "production")
DEFAULT_ENVIRONMENT="staging"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Target environment (staging|production)"
    echo "  -s, --skip-tests        Skip running tests before deployment"
    echo "  -f, --force             Force deployment without confirmation"
    echo "  -m, --migrate           Run database migrations"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e production -m     Deploy to production with migrations"
    echo "  $0 --skip-tests         Deploy to staging without tests"
    echo "  $0 --force              Deploy without confirmation prompts"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if required tools are installed
    command -v node >/dev/null 2>&1 || { log_error "Node.js is required but not installed."; exit 1; }
    command -v pnpm >/dev/null 2>&1 || { log_error "pnpm is required but not installed."; exit 1; }
    command -v vercel >/dev/null 2>&1 || { log_error "Vercel CLI is required but not installed."; exit 1; }
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    # Check if we're on the right branch for production
    if [ "$ENVIRONMENT" = "production" ]; then
        CURRENT_BRANCH=$(git branch --show-current)
        if [ "$CURRENT_BRANCH" != "main" ]; then
            log_warning "You're not on the main branch. Production deployments should be from main."
            if [ "$FORCE" != "true" ]; then
                read -p "Continue anyway? (y/N): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    log_info "Deployment cancelled."
                    exit 0
                fi
            fi
        fi
    fi
    
    log_success "Prerequisites check passed"
}

run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        log_warning "Skipping tests as requested"
        return 0
    fi
    
    log_info "Running tests..."
    
    # Type checking
    log_info "Running type check..."
    pnpm run type-check || { log_error "Type check failed"; exit 1; }
    
    # Linting
    log_info "Running linter..."
    pnpm run lint || { log_error "Linting failed"; exit 1; }
    
    # Unit tests
    log_info "Running unit tests..."
    pnpm run test || { log_error "Unit tests failed"; exit 1; }
    
    # Integration tests
    log_info "Running integration tests..."
    pnpm run test:integration || { log_error "Integration tests failed"; exit 1; }
    
    log_success "All tests passed"
}

build_application() {
    log_info "Building application..."
    
    # Install dependencies
    log_info "Installing dependencies..."
    pnpm install --frozen-lockfile || { log_error "Failed to install dependencies"; exit 1; }
    
    # Build the application
    log_info "Building Next.js application..."
    pnpm run build || { log_error "Build failed"; exit 1; }
    
    log_success "Application built successfully"
}

run_migrations() {
    if [ "$RUN_MIGRATIONS" != "true" ]; then
        return 0
    fi
    
    log_info "Running database migrations..."
    
    # Check if migrations are needed
    if [ -d "packages/database/migrations" ]; then
        log_info "Applying database migrations..."
        pnpm run db:migrate || { log_error "Database migration failed"; exit 1; }
        
        # Verify migrations
        log_info "Verifying migrations..."
        pnpm run db:verify || { log_error "Migration verification failed"; exit 1; }
        
        log_success "Database migrations completed"
    else
        log_warning "No migrations directory found"
    fi
}

deploy_to_vercel() {
    log_info "Deploying to Vercel ($ENVIRONMENT)..."
    
    # Set Vercel environment
    if [ "$ENVIRONMENT" = "production" ]; then
        VERCEL_ARGS="--prod"
    else
        VERCEL_ARGS=""
    fi
    
    # Deploy
    log_info "Starting Vercel deployment..."
    DEPLOYMENT_URL=$(vercel deploy $VERCEL_ARGS --yes 2>&1 | grep -o 'https://[^[:space:]]*' | tail -1)
    
    if [ -z "$DEPLOYMENT_URL" ]; then
        log_error "Failed to get deployment URL"
        exit 1
    fi
    
    log_success "Deployed to: $DEPLOYMENT_URL"
    
    # Wait for deployment to be ready
    log_info "Waiting for deployment to be ready..."
    sleep 30
    
    # Health check
    log_info "Running health check..."
    if curl -f "$DEPLOYMENT_URL/api/health" > /dev/null 2>&1; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        exit 1
    fi
    
    return 0
}

post_deployment_tasks() {
    log_info "Running post-deployment tasks..."
    
    # Warm up cache
    log_info "Warming up cache..."
    curl -s "$DEPLOYMENT_URL/api/trending" > /dev/null || log_warning "Failed to warm up trending cache"
    curl -s "$DEPLOYMENT_URL/api/artists" > /dev/null || log_warning "Failed to warm up artists cache"
    
    # Update monitoring
    if [ -n "$MONITORING_WEBHOOK" ]; then
        log_info "Notifying monitoring systems..."
        curl -X POST "$MONITORING_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"event\": \"deployment\", \"environment\": \"$ENVIRONMENT\", \"url\": \"$DEPLOYMENT_URL\"}" \
            > /dev/null 2>&1 || log_warning "Failed to notify monitoring"
    fi
    
    # Slack notification
    if [ -n "$SLACK_WEBHOOK" ]; then
        log_info "Sending Slack notification..."
        curl -X POST "$SLACK_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"🚀 MySetlist deployed to $ENVIRONMENT: $DEPLOYMENT_URL\"}" \
            > /dev/null 2>&1 || log_warning "Failed to send Slack notification"
    fi
    
    log_success "Post-deployment tasks completed"
}

cleanup() {
    log_info "Cleaning up..."
    
    # Clean up temporary files
    rm -rf .next/cache/webpack || true
    
    # Clean up old node_modules if needed
    if [ "$ENVIRONMENT" = "production" ]; then
        log_info "Cleaning up development dependencies..."
        pnpm prune --prod || log_warning "Failed to prune dependencies"
    fi
    
    log_success "Cleanup completed"
}

main() {
    log_info "Starting MySetlist deployment to $ENVIRONMENT"
    log_info "Timestamp: $(date)"
    log_info "Git commit: $(git rev-parse HEAD)"
    
    # Confirmation prompt
    if [ "$FORCE" != "true" ]; then
        echo
        log_warning "You are about to deploy to $ENVIRONMENT"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled."
            exit 0
        fi
    fi
    
    # Run deployment steps
    check_prerequisites
    run_tests
    build_application
    run_migrations
    deploy_to_vercel
    post_deployment_tasks
    cleanup
    
    log_success "🎉 Deployment to $ENVIRONMENT completed successfully!"
    log_info "Deployment URL: $DEPLOYMENT_URL"
    
    # Show next steps
    echo
    log_info "Next steps:"
    echo "  1. Monitor the application: $DEPLOYMENT_URL"
    echo "  2. Check logs: vercel logs $DEPLOYMENT_URL"
    echo "  3. Run smoke tests if needed"
    echo "  4. Update documentation if necessary"
}

# Parse command line arguments
ENVIRONMENT="$DEFAULT_ENVIRONMENT"
SKIP_TESTS="false"
FORCE="false"
RUN_MIGRATIONS="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--skip-tests)
            SKIP_TESTS="true"
            shift
            ;;
        -f|--force)
            FORCE="true"
            shift
            ;;
        -m|--migrate)
            RUN_MIGRATIONS="true"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${ENVIRONMENT} " ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    log_info "Valid environments: ${ENVIRONMENTS[*]}"
    exit 1
fi

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    log_info "Loading environment variables from .env.$ENVIRONMENT"
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
fi

# Run main deployment
main