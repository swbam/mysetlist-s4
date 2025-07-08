#!/bin/bash

# Run All Tests Script
# This script runs all test suites and generates a comprehensive report

set -e  # Exit on error

echo "🧪 Running All Tests..."
echo "========================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local command=$2
    
    echo -e "\n${YELLOW}Running ${suite_name}...${NC}"
    
    if eval "$command"; then
        echo -e "${GREEN}✅ ${suite_name} passed${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌ ${suite_name} failed${NC}"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
}

# 1. Run Unit Tests
run_test_suite "Unit Tests" "pnpm test -- --coverage --json --outputFile=jest-results.json"

# 2. Run Type Checking
run_test_suite "Type Check" "pnpm typecheck"

# 3. Run Linting
run_test_suite "Linting" "pnpm lint"

# 4. Run E2E Tests (if not in CI, run against dev server)
if [ -z "$CI" ]; then
    echo -e "${YELLOW}Starting dev server for E2E tests...${NC}"
    pnpm dev &
    DEV_PID=$!
    
    # Wait for server to start
    echo "Waiting for server to start..."
    npx wait-on http://localhost:3001 -t 30000
    
    run_test_suite "E2E Tests" "pnpm cypress:headless"
    
    # Stop dev server
    kill $DEV_PID 2>/dev/null || true
else
    run_test_suite "E2E Tests" "pnpm e2e"
fi

# 5. Run Accessibility Tests
if command -v playwright &> /dev/null; then
    run_test_suite "Accessibility Tests" "pnpm exec playwright test accessibility"
fi

# 6. Run Bundle Size Check
echo -e "\n${YELLOW}Checking bundle size...${NC}"
pnpm analyze > bundle-analysis.txt
echo -e "${GREEN}✅ Bundle analysis complete${NC}"

# Generate Test Report
echo -e "\n${YELLOW}Generating test report...${NC}"
npx tsx scripts/test-reporter.ts

# Summary
echo -e "\n========================"
echo -e "📊 TEST SUMMARY"
echo -e "========================"
echo -e "Total Test Suites: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Check the logs above for details.${NC}"
    exit 1
fi