#!/bin/bash

# Quick Production Readiness Check
# This script performs a rapid check of critical production requirements

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚀 TheSet Quick Production Check"
echo "==================================="
echo ""

# Function to check command
check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

# Function to check file
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

# Function to check env var
check_env() {
    if [ -n "${!1}" ]; then
        echo -e "${GREEN}✓${NC} $1 is set"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is not set"
        return 1
    fi
}

# Track failures
FAILURES=0

echo "1. Checking prerequisites..."
check_command "node" "Node.js installed" || ((FAILURES++))
check_command "pnpm" "pnpm installed" || ((FAILURES++))
check_command "vercel" "Vercel CLI installed" || ((FAILURES++))

echo ""
echo "2. Checking critical files..."
check_file "package.json" "package.json exists" || ((FAILURES++))
check_file "apps/web/package.json" "Web app package.json exists" || ((FAILURES++))
check_file "apps/web/next.config.ts" "Next.js config exists" || ((FAILURES++))
check_file "vercel.json" "Vercel config exists" || ((FAILURES++))

echo ""
echo "3. Checking environment..."
if [ -f ".env.production" ]; then
    source .env.production
fi
check_env "NEXT_PUBLIC_SITE_URL" || ((FAILURES++))
check_env "NEXT_PUBLIC_SUPABASE_URL" || ((FAILURES++))
check_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" || ((FAILURES++))

echo ""
echo "4. Checking build..."
if [ -d "apps/web/.next" ]; then
    echo -e "${GREEN}✓${NC} Build directory exists"
else
    echo -e "${YELLOW}!${NC} Build directory not found - run 'pnpm build'"
    ((FAILURES++))
fi

echo ""
echo "5. Quick API check..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/api/health" | grep -q "200"; then
    echo -e "${GREEN}✓${NC} Local API health check passed"
else
    echo -e "${YELLOW}!${NC} Local API not responding (start dev server to test)"
fi

echo ""
echo "==================================="
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo "Run 'pnpm deploy:checklist' for comprehensive verification"
    exit 0
else
    echo -e "${RED}❌ $FAILURES checks failed${NC}"
    echo "Fix the issues above before deployment"
    exit 1
fi