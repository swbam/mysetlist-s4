#!/bin/bash

echo "🧪 Testing MySetlist App Locally..."
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:3000"

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    status_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" == "$expected_status" ]; then
        echo -e "${GREEN}✓ Pass${NC} (Status: $status_code)"
        return 0
    else
        echo -e "${RED}✗ Fail${NC} (Status: $status_code, Expected: $expected_status)"
        return 1
    fi
}

# Function to test authenticated endpoint
test_auth_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer 6155002300" "$url" 2>/dev/null)
    status_code=$(echo "$response" | tail -1)
    
    if [ "$status_code" == "$expected_status" ]; then
        echo -e "${GREEN}✓ Pass${NC} (Status: $status_code)"
        return 0
    else
        echo -e "${RED}✗ Fail${NC} (Status: $status_code, Expected: $expected_status)"
        return 1
    fi
}

echo "1. Testing Database Connection"
echo "------------------------------"
test_endpoint "Database Test" "$BASE_URL/api/test-db"
echo ""

echo "2. Testing Search API"
echo "--------------------"
test_endpoint "Search (empty)" "$BASE_URL/api/search?q="
test_endpoint "Search (artist)" "$BASE_URL/api/search?q=taylor"
test_endpoint "Search (with types)" "$BASE_URL/api/search?q=music&types=artist,show"
echo ""

echo "3. Testing Trending APIs"
echo "-----------------------"
test_endpoint "Trending Artists" "$BASE_URL/api/trending/artists"
test_endpoint "Trending Shows" "$BASE_URL/api/trending/shows"
test_endpoint "Trending Venues" "$BASE_URL/api/trending/venues"
echo ""

echo "4. Testing Cron Endpoints"
echo "------------------------"
test_auth_endpoint "Master Sync (hourly)" "$BASE_URL/api/cron/master-sync?mode=hourly"
test_endpoint "Master Sync (no auth)" "$BASE_URL/api/cron/master-sync?mode=hourly" 401
test_auth_endpoint "Calculate Trending" "$BASE_URL/api/cron/calculate-trending"
echo ""

echo "5. Testing Page Routes"
echo "---------------------"
test_endpoint "Homepage" "$BASE_URL"
test_endpoint "Artists Page" "$BASE_URL/artists"
test_endpoint "Shows Page" "$BASE_URL/shows"
test_endpoint "Venues Page" "$BASE_URL/venues"
test_endpoint "Trending Page" "$BASE_URL/trending"
echo ""

echo "=================================="
echo "🎯 Test Summary"
echo "=================================="

# Quick health check
health_response=$(curl -s "$BASE_URL/api/test-db" 2>/dev/null)
overall_status=$(echo "$health_response" | grep -o '"overallStatus":"[^"]*"' | cut -d'"' -f4)

if [ "$overall_status" == "ready" ]; then
    echo -e "${GREEN}✅ App is ready for deployment!${NC}"
else
    echo -e "${YELLOW}⚠️  Some issues detected. Check the test results above.${NC}"
    echo ""
    echo "Run this to see detailed status:"
    echo "curl $BASE_URL/api/test-db | jq"
fi

echo ""
echo "To test on Vercel after deployment, replace $BASE_URL with:"
echo "https://mysetlist-sonnet.vercel.app"