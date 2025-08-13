#!/bin/bash

# =====================================================================
# Cleanup Supabase Edge Functions
# All cron jobs and sync operations are now handled by Vercel
# =====================================================================

echo "🧹 Cleaning up Supabase Edge Functions..."
echo "All sync operations are now handled by Vercel for better code reuse."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# List of edge functions to remove
FUNCTIONS_TO_REMOVE=(
    "scheduled-sync"
    "sync-artists"
    "sync-setlists"
    "sync-shows"
    "sync-artist-shows"
    "sync-concerts"
    "sync-song-catalog"
    "update-trending"
)

echo "📋 Functions to remove:"
for func in "${FUNCTIONS_TO_REMOVE[@]}"; do
    echo "   - $func"
done
echo ""

read -p "⚠️  This will delete all Supabase edge functions. Continue? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Deleting edge functions..."
    
    for func in "${FUNCTIONS_TO_REMOVE[@]}"; do
        if [ -d "supabase/functions/$func" ]; then
            echo "   Removing $func..."
            rm -rf "supabase/functions/$func"
        fi
    done
    
    # Keep only the health-check function as a minimal example
    echo ""
    echo "✅ Edge functions cleaned up. Keeping only:"
    echo "   - health-check (for monitoring)"
    echo "   - _shared/cors.ts (utility)"
    
    # Update the functions README
    cat > supabase/functions/README.md << 'EOF'
# Supabase Edge Functions

## Important: All Sync Operations Moved to Vercel

As of January 2025, all cron jobs and sync operations have been moved to Vercel for better code reuse and maintainability.

### Why the Move?

1. **Code Reuse**: Vercel functions can directly use the `ArtistImportOrchestrator` and other services
2. **Single Deployment**: One `git push` deploys everything
3. **Better Monitoring**: Unified logging and error tracking with Sentry
4. **Shared Resources**: Same database connections and caching layer

### Current Functions

- `health-check/` - Simple health check endpoint for monitoring

### Vercel Cron Jobs

All sync operations are now handled by Vercel cron jobs:

- `/api/cron/update-active-artists` - Every 6 hours
- `/api/cron/trending-artist-sync` - Daily at 2 AM
- `/api/cron/complete-catalog-sync` - Weekly Sunday 3 AM
- `/api/cron/calculate-trending` - Daily at 1 AM
- `/api/cron/master-sync` - Daily at 4 AM
- `/api/cron/sync-artist-data` - Every 12 hours
- `/api/cron/finish-mysetlist-sync` - Daily at 5 AM

See `vercel.json` for the complete cron configuration.
EOF

    echo ""
    echo "📝 Updated functions README with architecture documentation"
    
else
    echo "❌ Cleanup cancelled"
    exit 0
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Run the migration: pnpm db:migrate"
echo "2. Deploy to Supabase: supabase db push"
echo "3. Verify Vercel crons: check vercel.json"
echo "4. Test a cron job: curl -X POST https://your-domain.com/api/cron/calculate-trending -H 'x-cron-secret: YOUR_SECRET'"
echo ""
echo "✅ Cleanup complete!"