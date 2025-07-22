#!/bin/bash

echo "=== Cron Endpoints Cleanup Plan ==="
echo ""
echo "According to mysetlist-docs, we only need these sync operations:"
echo "1. Show sync (hourly)"
echo "2. Artist sync (daily)" 
echo "3. Setlist sync (6 hours)"
echo "4. Trending calculation"
echo ""
echo "Current cron endpoints that exist:"
echo "================================="

find apps/web/app/api/cron -name "*.ts" -type f | sort

echo ""
echo "Endpoints to KEEP (based on docs):"
echo "================================="
echo "❌ None of the current endpoints match the documented pattern!"
echo ""
echo "The docs show sync should be handled by:"
echo "- Supabase Functions: /functions/v1/sync-shows"
echo "- Supabase Functions: /functions/v1/sync-artists"  
echo "- Supabase Functions: /functions/v1/sync-setlists"
echo "- Supabase Functions: /functions/v1/calculate-trending"
echo ""
echo "OR via the unified sync service at:"
echo "- /api/sync/unified-pipeline"
echo ""
echo "All these cron endpoints appear to be unnecessary additions:"

# List all cron endpoints that should be removed
cat << 'EOF'
apps/web/app/api/cron/analytics/
apps/web/app/api/cron/backup/
apps/web/app/api/cron/cache-warm/
apps/web/app/api/cron/calculate-trending/
apps/web/app/api/cron/close-polls/
apps/web/app/api/cron/daily-reminders/
apps/web/app/api/cron/daily-sync/
apps/web/app/api/cron/data-maintenance/
apps/web/app/api/cron/email-processing/
apps/web/app/api/cron/email-processor/
apps/web/app/api/cron/health-check/
apps/web/app/api/cron/hourly-update/
apps/web/app/api/cron/keep-alive/
apps/web/app/api/cron/lock-setlists/
apps/web/app/api/cron/master-sync/
apps/web/app/api/cron/show-lifecycle/
apps/web/app/api/cron/sync-popular-artists/
apps/web/app/api/cron/trending-calculation/
apps/web/app/api/cron/update-analytics/
apps/web/app/api/cron/update-artist-popularity/
apps/web/app/api/cron/update-show-status/
apps/web/app/api/cron/update-stats/
apps/web/app/api/cron/weekly-digest/
apps/web/app/api/cron/test/
EOF

echo ""
echo "To clean up, run:"
echo "rm -rf apps/web/app/api/cron"
echo ""
echo "Then create only what's needed based on your actual sync implementation."