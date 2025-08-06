#!/bin/bash

# MySetlist Production Deployment Script
# Comprehensive DevOps automation for zero-downtime deployment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="mysetlist-sonnet"
DEPLOYMENT_ENV="production"
HEALTH_CHECK_URL="https://theset.live/api/health/comprehensive"
MONITORING_URL="https://theset.live/api/monitoring/dashboard"
SLACK_WEBHOOK_URL=""  # Add your Slack webhook URL here
ROLLBACK_ENABLED=true
PERFORMANCE_BUDGET_LCP=2500
PERFORMANCE_BUDGET_FCP=1800

# Logging
LOG_FILE="/tmp/mysetlist-deploy-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

echo -e "${BLUE}🚀 Starting MySetlist Production Deployment${NC}"
echo "Deployment started at: $(date)"
echo "Log file: $LOG_FILE"

# Function to log messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Function to send Slack notification
send_slack_notification() {
    local message="$1"
    local color="$2"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\", \"color\":\"$color\"}" \
            "$SLACK_WEBHOOK_URL" || log_warn "Failed to send Slack notification"
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites"
    
    # Check if required tools are installed
    command -v vercel >/dev/null 2>&1 || { log_error "Vercel CLI is required but not installed"; exit 1; }
    command -v pnpm >/dev/null 2>&1 || { log_error "pnpm is required but not installed"; exit 1; }
    command -v lighthouse >/dev/null 2>&1 || { log_error "Lighthouse is required but not installed"; exit 1; }
    command -v curl >/dev/null 2>&1 || { log_error "curl is required but not installed"; exit 1; }
    
    # Check if we're in the correct directory
    if [[ ! -f "package.json" ]] || [[ ! -d "apps/web" ]]; then
        log_error "Must be run from the project root directory"
        exit 1
    fi
    
    # Check if environment variables are set
    if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" ]]; then
        log_error "NEXT_PUBLIC_SUPABASE_URL must be set"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Function to run pre-deployment tests
run_pre_deployment_tests() {
    log_step "Running pre-deployment tests"
    
    # Type checking
    log_info "Running TypeScript type checking"
    cd apps/web
    pnpm typecheck || { log_error "TypeScript errors found"; exit 1; }
    
    # Linting
    log_info "Running ESLint"
    pnpm lint || { log_error "Linting errors found"; exit 1; }
    
    # Unit tests
    log_info "Running unit tests"
    pnpm test || { log_error "Unit tests failed"; exit 1; }
    
    # Build test
    log_info "Testing build process"
    pnpm build || { log_error "Build failed"; exit 1; }
    
    cd ../..
    log_info "Pre-deployment tests passed"
}

# Function to create deployment backup
create_deployment_backup() {
    log_step "Creating deployment backup"
    
    # Get current deployment info
    CURRENT_DEPLOYMENT=$(vercel ls --scope swbams-projects | grep "$PROJECT_NAME" | head -1 | awk '{print $1}')
    
    if [[ -n "$CURRENT_DEPLOYMENT" ]]; then
        log_info "Current deployment: $CURRENT_DEPLOYMENT"
        echo "$CURRENT_DEPLOYMENT" > /tmp/mysetlist-backup-deployment.txt
        log_info "Backup info saved to /tmp/mysetlist-backup-deployment.txt"
    else
        log_warn "No current deployment found"
    fi
}

# Function to deploy to Vercel
deploy_to_vercel() {
    log_step "Deploying to Vercel"
    
    cd apps/web
    
    # Deploy to production
    log_info "Starting Vercel deployment"
    DEPLOYMENT_OUTPUT=$(vercel --prod --confirm 2>&1)
    DEPLOYMENT_URL=$(echo "$DEPLOYMENT_OUTPUT" | grep -o 'https://[^[:space:]]*' | head -1)
    
    if [[ -z "$DEPLOYMENT_URL" ]]; then
        log_error "Failed to get deployment URL"
        log_error "Deployment output: $DEPLOYMENT_OUTPUT"
        exit 1
    fi
    
    log_info "Deployment URL: $DEPLOYMENT_URL"
    echo "$DEPLOYMENT_URL" > /tmp/mysetlist-deployment-url.txt
    
    cd ../..
}

# Function to run health checks
run_health_checks() {
    log_step "Running health checks"
    
    local url="$1"
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        log_info "Health check attempt $((attempt + 1))/$max_attempts"
        
        if curl -f -s "$url/api/health/comprehensive" > /dev/null; then
            log_info "Health check passed"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    log_error "Health checks failed after $max_attempts attempts"
    return 1
}

# Function to run performance tests
run_performance_tests() {
    log_step "Running performance tests"
    
    local url="$1"
    
    # Run Lighthouse audit
    log_info "Running Lighthouse audit"
    lighthouse "$url" --output json --output-path /tmp/lighthouse-report.json --chrome-flags="--headless" || {
        log_warn "Lighthouse audit failed"
        return 1
    }
    
    # Parse Lighthouse results
    local lcp_score=$(jq '.audits["largest-contentful-paint"].numericValue' /tmp/lighthouse-report.json)
    local fcp_score=$(jq '.audits["first-contentful-paint"].numericValue' /tmp/lighthouse-report.json)
    local performance_score=$(jq '.categories.performance.score' /tmp/lighthouse-report.json)
    
    log_info "Performance Results:"
    log_info "  LCP: ${lcp_score}ms (budget: ${PERFORMANCE_BUDGET_LCP}ms)"
    log_info "  FCP: ${fcp_score}ms (budget: ${PERFORMANCE_BUDGET_FCP}ms)"
    log_info "  Performance Score: $(echo "$performance_score * 100" | bc -l)%"
    
    # Check performance budget
    if (( $(echo "$lcp_score > $PERFORMANCE_BUDGET_LCP" | bc -l) )); then
        log_warn "LCP exceeds budget: ${lcp_score}ms > ${PERFORMANCE_BUDGET_LCP}ms"
    fi
    
    if (( $(echo "$fcp_score > $PERFORMANCE_BUDGET_FCP" | bc -l) )); then
        log_warn "FCP exceeds budget: ${fcp_score}ms > ${PERFORMANCE_BUDGET_FCP}ms"
    fi
    
    if (( $(echo "$performance_score < 0.9" | bc -l) )); then
        log_warn "Performance score below 90%: $(echo "$performance_score * 100" | bc -l)%"
    fi
}

# Function to run smoke tests
run_smoke_tests() {
    log_step "Running smoke tests"
    
    local url="$1"
    
    # Test critical endpoints
    local endpoints=(
        "/api/health"
        "/api/trending"
        "/api/search"
        "/api/artists/search"
        "/"
        "/trending"
        "/artists"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log_info "Testing endpoint: $endpoint"
        
        if curl -f -s "$url$endpoint" > /dev/null; then
            log_info "✓ $endpoint OK"
        else
            log_error "✗ $endpoint FAILED"
            return 1
        fi
    done
    
    log_info "All smoke tests passed"
}

# Function to update monitoring
update_monitoring() {
    log_step "Updating monitoring configuration"
    
    # Update Sentry release
    if [[ -n "$SENTRY_AUTH_TOKEN" ]]; then
        log_info "Creating Sentry release"
        local commit_sha=$(git rev-parse HEAD)
        curl -X POST "https://sentry.io/api/0/organizations/mysetlist/releases/" \
            -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"version\":\"$commit_sha\",\"projects\":[\"mysetlist-web\"]}" || {
            log_warn "Failed to create Sentry release"
        }
    fi
    
    # Test monitoring dashboard
    log_info "Testing monitoring dashboard"
    curl -f -s "$MONITORING_URL" > /dev/null || {
        log_warn "Monitoring dashboard test failed"
    }
}

# Function to rollback deployment
rollback_deployment() {
    log_step "Rolling back deployment"
    
    if [[ ! -f "/tmp/mysetlist-backup-deployment.txt" ]]; then
        log_error "No backup deployment found"
        return 1
    fi
    
    local backup_deployment=$(cat /tmp/mysetlist-backup-deployment.txt)
    log_info "Rolling back to: $backup_deployment"
    
    cd apps/web
    vercel alias set "$backup_deployment" theset.live || {
        log_error "Rollback failed"
        return 1
    }
    cd ../..
    
    log_info "Rollback completed"
}

# Function to finalize deployment
finalize_deployment() {
    log_step "Finalizing deployment"
    
    local deployment_url=$(cat /tmp/mysetlist-deployment-url.txt)
    
    # Set production alias
    log_info "Setting production alias"
    cd apps/web
    vercel alias set "$deployment_url" theset.live || {
        log_error "Failed to set production alias"
        return 1
    }
    cd ../..
    
    # Clean up temporary files
    rm -f /tmp/mysetlist-backup-deployment.txt
    rm -f /tmp/mysetlist-deployment-url.txt
    rm -f /tmp/lighthouse-report.json
    
    log_info "Deployment finalized successfully"
}

# Function to send deployment notification
send_deployment_notification() {
    local status="$1"
    local message="$2"
    
    if [[ "$status" == "success" ]]; then
        send_slack_notification "🚀 MySetlist deployment successful: $message" "good"
    else
        send_slack_notification "❌ MySetlist deployment failed: $message" "danger"
    fi
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    # Send start notification
    send_deployment_notification "info" "Deployment started"
    
    # Run deployment steps
    check_prerequisites
    run_pre_deployment_tests
    create_deployment_backup
    deploy_to_vercel
    
    # Get deployment URL
    local deployment_url=$(cat /tmp/mysetlist-deployment-url.txt)
    
    # Run post-deployment tests
    if run_health_checks "$deployment_url" && \
       run_performance_tests "$deployment_url" && \
       run_smoke_tests "$deployment_url"; then
        
        # Tests passed, finalize deployment
        update_monitoring
        finalize_deployment
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_info "🎉 Deployment completed successfully in ${duration}s"
        send_deployment_notification "success" "Deployment completed in ${duration}s"
        
    else
        # Tests failed, rollback if enabled
        if [[ "$ROLLBACK_ENABLED" == "true" ]]; then
            log_error "Post-deployment tests failed, rolling back"
            rollback_deployment
            send_deployment_notification "error" "Deployment failed, rolled back"
        else
            log_error "Post-deployment tests failed, rollback disabled"
            send_deployment_notification "error" "Deployment failed, manual intervention required"
        fi
        
        exit 1
    fi
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; send_deployment_notification "error" "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"

log_info "Deployment log saved to: $LOG_FILE"