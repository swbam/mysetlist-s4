#!/usr/bin/env bash
set -euo pipefail

# Concrete test commands for MySetlist production
# Note: update CRON_SECRET if rotated
BASE_URL="https://mysetlist-sonnet.vercel.app"
CRON_SECRET="6155002300"

# Helper to echo and run commands
run() {
  echo "\n$ $*" >&2
  eval "$@"
}

# Master sync (GET to bypass CSRF; POST also supported)
run "curl -sS -X GET \"$BASE_URL/api/cron/master-sync?mode=hourly\" \\
  -H 'Authorization: Bearer $CRON_SECRET' -H 'Content-Type: application/json' | jq ."

# Artist sync refresh (GET to bypass CSRF; POST also supported)
run "curl -sS -X GET \"$BASE_URL/api/cron/sync-artist-data?limit=20&mode=auto\" \\
  -H 'Authorization: Bearer $CRON_SECRET' -H 'Content-Type: application/json' | jq ."

# Trending calculation (GET to bypass CSRF; POST also supported)
run "curl -sS -X GET \"$BASE_URL/api/cron/calculate-trending\" \\
  -H 'Authorization: Bearer $CRON_SECRET' | jq ."

# Inline search (artists)
run "curl -sS \"$BASE_URL/api/search?q=metallica&limit=5\" | jq ."

# One-click import (Ticketmaster attraction)
run "curl -sS -X POST \"$BASE_URL/api/artists/import\" -H 'Content-Type: application/json' \\
  -d '{"tmAttractionId":"K8vZ9171ofV"}' | jq ."

# Orchestration (full sync pipeline). Requires Authorization header.
run "curl -sS -X POST \"$BASE_URL/api/sync/artist\" -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer $CRON_SECRET' \\
  -d '{"ticketmasterId":"K8vZ9171ofV","artistName":"Metallica"}' | jq ."

# Health check (optional)
run "curl -sS \"$BASE_URL/api/health\" | jq . || true"
