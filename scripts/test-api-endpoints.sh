#!/bin/bash

# API Endpoints Test Script
# Tests the MySetlist API endpoints without requiring Node.js dependencies

set -e

# Load environment variables
if [ -f "apps/web/.env.local" ]; then
    source apps/web/.env.local
    echo "✅ Environment variables loaded"
else
    echo "❌ Could not find apps/web/.env.local"
    exit 1
fi

# Configuration
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3001}"
echo "🌐 Testing endpoints at: $APP_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local auth_header="$4"
    local body="$5"
    
    echo -n "🔄 Testing $name... "
    
    local curl_cmd="curl -s -w '%{http_code}' -o /tmp/response.json"
    
    if [ "$method" = "POST" ]; then
        curl_cmd="$curl_cmd -X POST"
    fi
    
    if [ -n "$auth_header" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth_header'"
    fi
    
    if [ -n "$body" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$body'"
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    local status_code
    status_code=$(eval "$curl_cmd")
    
    if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 400 ]; then
        echo -e "${GREEN}✅ $status_code${NC}"
        return 0
    else
        echo -e "${RED}❌ $status_code${NC}"
        echo "   Response: $(cat /tmp/response.json | head -c 200)"
        return 1
    fi
}

echo "🧪 Testing API Endpoints"
echo "========================"
echo ""

# Test basic endpoints
test_endpoint "Health Check" "$APP_URL/api/health"
test_endpoint "Stats Endpoint" "$APP_URL/api/stats"

# Test cron endpoints with auth
if [ -n "$CRON_SECRET" ]; then
    echo ""
    echo "🔐 Testing Cron Endpoints (with auth)"
    test_endpoint "Master Sync (GET)" "$APP_URL/api/cron/master-sync?mode=manual" "GET" "$CRON_SECRET"
    test_endpoint "Artist Sync" "$APP_URL/api/cron/sync-artist-data" "POST" "$CRON_SECRET" '{"limit":5,"mode":"manual"}'
    test_endpoint "Trending Update" "$APP_URL/api/cron/calculate-trending" "POST" "$CRON_SECRET" '{}'
    test_endpoint "Finish Sync" "$APP_URL/api/cron/finish-mysetlist-sync" "POST" "$CRON_SECRET" '{"mode":"manual","orchestrate":false}'
else
    echo "⚠️  CRON_SECRET not set, skipping cron endpoint tests"
fi

# Test public endpoints
echo ""
echo "🌍 Testing Public Endpoints"
test_endpoint "Search Artists" "$APP_URL/api/search?type=artists&q=test"
test_endpoint "Popular Artists" "$APP_URL/api/popular-artists"
test_endpoint "Trending Data" "$APP_URL/api/trending"

# Test artist import endpoint (without tmAttractionId, should return 400)
echo ""
echo "🎵 Testing Artist Import"
test_endpoint "Artist Import (no params)" "$APP_URL/api/artists/import" "POST" "" '{}'

# Summary
echo ""
echo "📊 Test completed!"
echo ""
echo "💡 If endpoints are failing:"
echo "   • Make sure the development server is running (pnpm dev)"
echo "   • Check that all environment variables are set correctly"
echo "   • Verify database connection is working"
echo ""

# Cleanup
rm -f /tmp/response.json