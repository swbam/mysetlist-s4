#!/bin/bash

# Script to fix cookie context errors in API routes
# This script replaces createClient with createServiceClient for routes that don't need authentication

echo "Fixing cookie context errors in API routes..."

# Routes that can safely use createServiceClient (no authentication needed)
API_ROUTES=(
  "trending/artists/route.ts"
  "trending/shows/route.ts" 
  "trending/venues/route.ts"
  "trending/route.ts"
  "venues/route.ts"
  "artists/route.ts"
  "search/route.ts"
  "recommendations/route.ts"
  "activity-feed/route.ts"
  "admin/system-health/route.ts"
  "admin/verify-integrity/route.ts"
  "admin/ticketmaster-sync/route.ts"
  "scheduled/_deprecated/lock-setlists/route.ts"
)

cd /root/repo/apps/web/app/api

for route in "${API_ROUTES[@]}"; do
  if [[ -f "$route" ]]; then
    echo "Fixing $route..."
    
    # Replace import statement
    sed -i 's/import { createClient }/import { createServiceClient }/g' "$route"
    
    # Replace usage
    sed -i 's/const supabase = await createClient();/const supabase = createServiceClient();/g' "$route"
    sed -i 's/supabase = await createClient();/supabase = createServiceClient();/g' "$route"
    
    echo "Fixed $route"
  else
    echo "Warning: $route not found"
  fi
done

echo "Cookie context error fixes completed!"