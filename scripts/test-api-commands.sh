#!/usr/bin/env bash
set -euo pipefail

# Concrete test commands for MySetlist production
BASE_URL="https://mysetlist-sonnet.vercel.app"
# Prefer service role for authorization if available; fallback to CRON_SECRET
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY5MjMxNiwiZXhwIjoyMDY2MjY4MzE2fQ.ZMorLC_eZke3bvBAF0zyzqUONxpomfTN2RpE_mLjz18"
CRON_SECRET="6155002300"
AUTH_TOKEN="${SUPABASE_SERVICE_ROLE_KEY:-$CRON_SECRET}"

# Helper to echo and run commands
run() {
  echo "\n$ $*" >&2
  eval "$@"
}

# Master sync (GET to bypass CSRF; POST also supported)
run "curl -sS -X GET \"$BASE_URL/api/cron/master-sync?mode=hourly\" \\
  -H 'Authorization: Bearer $AUTH_TOKEN' -H 'Content-Type: application/json' | jq ."

# Artist sync refresh (GET to bypass CSRF; POST also supported)
run "curl -sS -X GET \"$BASE_URL/api/cron/sync-artist-data?limit=20&mode=auto\" \\
  -H 'Authorization: Bearer $AUTH_TOKEN' -H 'Content-Type: application/json' | jq ."

# Trending calculation (GET to bypass CSRF; POST also supported)
run "curl -sS -X GET \"$BASE_URL/api/cron/calculate-trending\" \\
  -H 'Authorization: Bearer $AUTH_TOKEN' | jq ."

# Inline search (artists)
run "curl -sS \"$BASE_URL/api/search?q=metallica&limit=5\" | jq ."

# One-click import (Ticketmaster attraction)
run "curl -sS -X POST \"$BASE_URL/api/artists/import\" -H 'Content-Type: application/json' \\
  -d '{"tmAttractionId":"K8vZ9171ofV","artistName":"Metallica"}' | jq ."

# Orchestration (full sync pipeline). Requires Authorization header.
run "curl -sS -X POST \"$BASE_URL/api/sync/artist\" -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer $AUTH_TOKEN' \\
  -d '{"ticketmasterId":"K8vZ9171ofV","artistName":"Metallica"}' | jq ."

# Health check (optional)
run "curl -sS \"$BASE_URL/api/health\" | jq . || true"