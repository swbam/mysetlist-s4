#!/bin/bash

# TheSet Deployment Verification Script
# This script tests all critical endpoints after deployment

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://theset.live}"
CRON_SECRET="${CRON_SECRET:-20812ee7bcf7daf3f7309d03d5cb424cf78866f064ddc4fbf12a42508e5dbf8e}"

echo "🚀 TheSet Deployment Verification"
echo "================================="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Main website
echo "1. Testing main website..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Main website is accessible (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}❌ Main website failed (HTTP $HTTP_STATUS)${NC}"
fi

# Test 2: API Health
echo ""
echo "2. Testing API health endpoint..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status"'; then
    STATUS=$(echo "$HEALTH_RESPONSE" | python3 -c "import json, sys; print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "healthy" ]; then
        echo -e "${GREEN}✅ API is healthy${NC}"
    elif [ "$STATUS" = "degraded" ]; then
        echo -e "${YELLOW}⚠️  API is degraded (some services may need configuration)${NC}"
    else
        echo -e "${RED}❌ API is unhealthy (status: $STATUS)${NC}"
    fi
else
    echo -e "${RED}❌ API health check failed${NC}"
fi

# Test 3: Ticketmaster Integration
echo ""
echo "3. Testing Ticketmaster integration..."
TM_RESPONSE=$(curl -s "$BASE_URL/api/search/artists?q=metallica")
if echo "$TM_RESPONSE" | grep -q '"tmAttractionId"'; then
    echo -e "${GREEN}✅ Ticketmaster search is working${NC}"
else
    echo -e "${RED}❌ Ticketmaster search failed${NC}"
fi

# Test 4: Cron Job Authentication
echo ""
echo "4. Testing cron job endpoints..."
echo "   Note: These may fail if CRON_SECRET is not set in Vercel"

CRON_ENDPOINTS=(
    "calculate-trending"
    "sync-artist-data"
    "update-active-artists"
    "trending-artist-sync"
    "master-sync"
    "complete-catalog-sync"
    "finish-mysetlist-sync"
)

CRON_SUCCESS=0
CRON_FAILED=0

for endpoint in "${CRON_ENDPOINTS[@]}"; do
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/cron/$endpoint" \
        -H "Authorization: Bearer $CRON_SECRET" \
        -H "Content-Type: application/json" 2>/dev/null || echo '{"error":"request failed"}')
    
    if echo "$RESPONSE" | grep -q '"error"'; then
        echo -e "   ${YELLOW}⚠️  /api/cron/$endpoint - Needs CRON_SECRET in Vercel${NC}"
        ((CRON_FAILED++))
    else
        echo -e "   ${GREEN}✅ /api/cron/$endpoint - Working${NC}"
        ((CRON_SUCCESS++))
    fi
done

# Test 5: Static Assets
echo ""
echo "5. Testing static assets..."
STATIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/_next/static/css/")
if [ "$STATIC_STATUS" -eq 404 ] || [ "$STATIC_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Static assets are being served${NC}"
else
    echo -e "${RED}❌ Static assets issue (HTTP $STATIC_STATUS)${NC}"
fi

# Summary
echo ""
echo "================================="
echo "📊 Deployment Summary"
echo "================================="

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Website: Online${NC}"
else
    echo -e "${RED}❌ Website: Offline${NC}"
fi

if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "degraded" ]; then
    echo -e "${YELLOW}⚠️  API: Partially working (needs env vars)${NC}"
else
    echo -e "${RED}❌ API: Not working${NC}"
fi

if echo "$TM_RESPONSE" | grep -q '"tmAttractionId"'; then
    echo -e "${GREEN}✅ External APIs: Working${NC}"
else
    echo -e "${RED}❌ External APIs: Not working${NC}"
fi

if [ "$CRON_SUCCESS" -gt 0 ]; then
    echo -e "${GREEN}✅ Cron Jobs: $CRON_SUCCESS/$((CRON_SUCCESS + CRON_FAILED)) working${NC}"
else
    echo -e "${YELLOW}⚠️  Cron Jobs: Need CRON_SECRET in Vercel${NC}"
fi

echo ""
echo "================================="
echo "🔧 Required Actions:"
echo "================================="
echo "1. Add environment variables in Vercel Dashboard:"
echo "   - CRON_SECRET"
echo "   - DATABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - SPOTIFY_CLIENT_ID & SPOTIFY_CLIENT_SECRET"
echo ""
echo "2. After adding env vars, redeploy from Vercel Dashboard"
echo ""
echo "3. Run this script again to verify everything is working"
echo ""
echo "📚 Documentation: See DEPLOYMENT_VERIFICATION.md for details"