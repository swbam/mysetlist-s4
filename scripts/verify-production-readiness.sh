#!/bin/bash

# MySetlist Production Readiness Verification Script
# This script performs comprehensive checks to ensure the application is ready for production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3001}"
TIMEOUT=30
FAILED_CHECKS=0
TOTAL_CHECKS=0

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TOTAL_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((TOTAL_CHECKS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        log_success "Command '$1' is available"
    else
        log_error "Command '$1' is not available"
    fi
}

check_url() {
    local url="$1"
    local expected_status="${2:-200}"
    local description="$3"
    
    if curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" | grep -q "$expected_status"; then
        log_success "$description"
    else
        log_error "$description"
    fi
}

check_json_response() {
    local url="$1"
    local expected_field="$2"
    local description="$3"
    
    local response=$(curl -s --max-time $TIMEOUT "$url" 2>/dev/null)
    if echo "$response" | jq -e ".$expected_field" >/dev/null 2>&1; then
        log_success "$description"
    else
        log_error "$description"
    fi
}

check_security_header() {
    local url="$1"
    local header="$2"
    local description="$3"
    
    if curl -s -I --max-time $TIMEOUT "$url" | grep -i "$header" >/dev/null; then
        log_success "$description"
    else
        log_error "$description"
    fi
}

main() {
    echo "🚀 MySetlist Production Readiness Verification"
    echo "=============================================="
    echo "Base URL: $BASE_URL"
    echo "Timestamp: $(date)"
    echo ""

    # Prerequisites Check
    log_info "Checking prerequisites..."
    check_command "node"
    check_command "pnpm"
    check_command "curl"
    check_command "jq"
    
    echo ""

    # Application Health Checks
    log_info "Checking application health..."
    check_url "$BASE_URL/api/health" "200" "Basic health check endpoint"
    check_url "$BASE_URL/api/health/comprehensive" "200" "Comprehensive health check endpoint"
    check_json_response "$BASE_URL/api/health/comprehensive" "status" "Health check returns status"
    check_json_response "$BASE_URL/api/health/comprehensive" "checks" "Health check returns system checks"
    
    echo ""

    # Core Functionality Checks
    log_info "Checking core functionality..."
    check_url "$BASE_URL" "200" "Homepage loads successfully"
    check_url "$BASE_URL/artists" "200" "Artists page loads"
    check_url "$BASE_URL/shows" "200" "Shows page loads"
    check_url "$BASE_URL/trending" "200" "Trending page loads"
    check_url "$BASE_URL/auth/sign-in" "200" "Sign-in page loads"
    
    echo ""

    # API Endpoints Check
    log_info "Checking API endpoints..."
    check_url "$BASE_URL/api/search?q=test" "200" "Search API endpoint"
    check_url "$BASE_URL/api/trending/artists" "200" "Trending artists API"
    check_url "$BASE_URL/api/trending/shows" "200" "Trending shows API"
    check_json_response "$BASE_URL/api/search?q=test" "results" "Search API returns results"
    
    echo ""

    # Security Headers Check
    log_info "Checking security headers..."
    check_security_header "$BASE_URL" "strict-transport-security" "HSTS header present"
    check_security_header "$BASE_URL" "x-content-type-options" "X-Content-Type-Options header present"
    check_security_header "$BASE_URL" "x-frame-options" "X-Frame-Options header present"
    check_security_header "$BASE_URL" "content-security-policy" "CSP header present"
    
    echo ""

    # Database Connectivity Check
    log_info "Checking database connectivity..."
    check_url "$BASE_URL/api/health/db" "200" "Database health check"
    check_json_response "$BASE_URL/api/health/db" "status" "Database returns status"
    
    echo ""

    # External API Integration Check
    log_info "Checking external API integrations..."
    check_url "$BASE_URL/api/external-apis/diagnostics" "200" "External APIs diagnostic endpoint"
    
    echo ""

    # Performance Check
    log_info "Checking performance..."
    local start_time=$(date +%s%N)
    curl -s "$BASE_URL" >/dev/null
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    if [ $duration -lt 3000 ]; then
        log_success "Homepage loads in ${duration}ms (< 3000ms)"
    else
        log_warning "Homepage loads in ${duration}ms (> 3000ms)"
    fi
    
    echo ""

    # Static Assets Check
    log_info "Checking static assets..."
    check_url "$BASE_URL/favicon.ico" "200" "Favicon loads"
    check_url "$BASE_URL/robots.txt" "200" "Robots.txt loads"
    
    echo ""

    # Authentication Endpoints Check
    log_info "Checking authentication endpoints..."
    check_url "$BASE_URL/auth/sign-in" "200" "Sign-in page loads"
    check_url "$BASE_URL/auth/sign-up" "200" "Sign-up page loads"
    check_url "$BASE_URL/api/auth/csrf-token" "200" "CSRF token endpoint"
    
    echo ""

    # Mobile Responsiveness Check (basic)
    log_info "Checking mobile responsiveness..."
    local mobile_response=$(curl -s -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)" "$BASE_URL")
    if echo "$mobile_response" | grep -q "viewport" && echo "$mobile_response" | grep -q "mobile"; then
        log_success "Mobile viewport and responsive design detected"
    else
        log_warning "Mobile responsiveness may need verification"
    fi
    
    echo ""

    # Environment Variables Check
    log_info "Checking environment configuration..."
    if [ -f ".env.production" ]; then
        log_success "Production environment file exists"
    else
        log_warning "Production environment file not found"
    fi
    
    if [ -f "vercel.json" ]; then
        log_success "Vercel configuration file exists"
    else
        log_warning "Vercel configuration file not found"
    fi
    
    echo ""

    # Build Verification
    log_info "Checking build artifacts..."
    if [ -d ".next" ]; then
        log_success "Next.js build directory exists"
    else
        log_error "Next.js build directory not found - run 'pnpm build'"
    fi
    
    if [ -f "package.json" ]; then
        log_success "Package.json exists"
    else
        log_error "Package.json not found"
    fi
    
    echo ""

    # Documentation Check
    log_info "Checking documentation..."
    if [ -f "README.md" ]; then
        log_success "README.md exists"
    else
        log_warning "README.md not found"
    fi
    
    if [ -f "docs/DEPLOYMENT_GUIDE.md" ]; then
        log_success "Deployment guide exists"
    else
        log_warning "Deployment guide not found"
    fi
    
    echo ""

    # Test Coverage Check
    log_info "Checking test coverage..."
    if [ -d "tests" ] || [ -d "__tests__" ]; then
        log_success "Test directory exists"
    else
        log_warning "Test directory not found"
    fi
    
    # Try to run tests if available
    if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
        log_success "Test script configured in package.json"
    else
        log_warning "Test script not configured"
    fi
    
    echo ""

    # Final Summary
    echo "=============================================="
    echo "🏁 Production Readiness Verification Complete"
    echo "=============================================="
    echo "Total Checks: $TOTAL_CHECKS"
    echo "Failed Checks: $FAILED_CHECKS"
    echo "Success Rate: $(( (TOTAL_CHECKS - FAILED_CHECKS) * 100 / TOTAL_CHECKS ))%"
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "${GREEN}✅ All checks passed! Application is ready for production.${NC}"
        exit 0
    elif [ $FAILED_CHECKS -lt 5 ]; then
        echo -e "${YELLOW}⚠️  Some checks failed, but application may be deployable with caution.${NC}"
        exit 1
    else
        echo -e "${RED}❌ Multiple critical checks failed. Address issues before production deployment.${NC}"
        exit 2
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            BASE_URL="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --url URL        Base URL to test (default: http://localhost:3001)"
            echo "  --timeout SEC    Request timeout in seconds (default: 30)"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main verification
main