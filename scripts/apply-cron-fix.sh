#!/bin/bash

# Apply cron job fix to use API routes with correct domain
# Run this script to update all cron jobs in the database

echo "🔧 Applying cron job fix..."
echo "=============================="
echo ""

# Check if we have database access
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in environment"
  echo "   Please ensure you have a .env.local file with DATABASE_URL"
  exit 1
fi

echo "📊 Current Status:"
echo "------------------"

# First, show current cron jobs
echo "Current cron jobs in database:"
psql "$DATABASE_URL" -c "SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;" 2>/dev/null || echo "Could not query cron jobs"

echo ""
echo "🚀 Applying migration..."
echo "-----------------------"

# Apply the migration
psql "$DATABASE_URL" -f supabase/migrations/20250729_update_cron_jobs_to_vercel_app.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration applied successfully!"
  echo ""
  echo "📊 Updated cron jobs:"
  psql "$DATABASE_URL" -c "SELECT jobname, schedule, command FROM cron.job ORDER BY jobname;" 2>/dev/null
  
  echo ""
  echo "💡 Next steps:"
  echo "1. Run 'pnpm fix:pipeline' to seed initial data"
  echo "2. Visit https://mysetlist-sonnet.vercel.app to see the app"
  echo "3. Cron jobs will now sync data periodically"
else
  echo ""
  echo "❌ Migration failed. Please check your database connection."
  exit 1
fi