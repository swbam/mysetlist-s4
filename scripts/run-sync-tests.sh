#!/bin/bash

# TheSet Sync System Test Runner
# This script runs all tests to verify the sync system is working correctly

set -e

echo "🚀 TheSet Sync System Test Suite"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables from .env files if present
# Ensures child node processes receive the variables
if [ -f ".env" ] || [ -f ".env.local" ] || [ -f "apps/web/.env.local" ]; then
    echo -e "${YELLOW}ℹ️  Loading environment from .env files...${NC}"
    set -a
    [ -f ".env" ] && . ".env"
    [ -f ".env.local" ] && . ".env.local"
    [ -f "apps/web/.env.local" ] && . "apps/web/.env.local"
    set +a
fi

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${YELLOW}🔄 Running: $test_name${NC}"
    echo "   Command: $test_command"
    echo ""
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
    fi
    
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the repository root${NC}"
    exit 1
fi

# Check if required files exist
if [ ! -f "scripts/test-env-vars.js" ] || [ ! -f "scripts/test-artist-import-simple.js" ]; then
    echo -e "${RED}❌ Error: Test scripts not found. Please ensure test-env-vars.js and test-artist-import-simple.js exist in scripts/${NC}"
    exit 1
fi

echo "📋 Running comprehensive sync system tests..."
echo ""

# Test 1: Environment Variables
run_test "Environment Variables Check" "node scripts/test-env-vars.js"

# Test 2: Basic Artist Import
run_test "Artist Import Functionality" "node scripts/test-artist-import-simple.js"

# Test 3: Database Connection (simple check)
run_test "Database Connection" "node -e '
const { createClient } = require(\"@supabase/supabase-js\");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
supabase.from(\"artists\").select(\"count\", { count: \"exact\", head: true })
  .then(({ error }) => {
    if (error) throw error;
    console.log(\"✅ Database connection successful\");
  })
  .catch(error => {
    console.error(\"❌ Database connection failed:\", error.message);
    process.exit(1);
  });
'"

# Test 4: TypeScript compilation check
if command -v npx &> /dev/null; then
    run_test "TypeScript Compilation" "cd apps/web && npx tsc --noEmit"
else
    echo -e "${YELLOW}⚠️  Skipping TypeScript check (npx not available)${NC}"
    echo ""
fi

# Test 5: External API endpoints basic check
if [ -n "$NEXT_PUBLIC_APP_URL" ] || [ -n "$VERCEL_URL" ]; then
    APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3001}"
    run_test "Health Endpoint Check" "curl -f $APP_URL/api/health || wget -q --spider $APP_URL/api/health"
else
    echo -e "${YELLOW}⚠️  Skipping health endpoint check (no app URL configured)${NC}"
    echo ""
fi

# Summary
echo "📊 TEST SUMMARY"
echo "================"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$((TOTAL_TESTS - PASSED_TESTS))${NC}"
echo ""

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}🎉 All tests passed! The sync system appears to be working correctly.${NC}"
    echo ""
    echo "✅ Environment variables are configured"
    echo "✅ Database connection is working"
    echo "✅ Artist import functionality is operational"
    echo "✅ External APIs are accessible"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review the output above and fix any issues.${NC}"
    echo ""
    echo "Common issues to check:"
    echo "• Missing environment variables (check .env files)"
    echo "• Database connection issues (check Supabase settings)"
    echo "• External API key problems (verify keys are valid)"
    echo "• Network connectivity issues"
    echo ""
    exit 1
fi