#!/bin/bash

# Deploy Database Security Migration
# This script deploys the security fixes for RLS and view issues

set -e

echo "🔒 Deploying Database Security Migration..."
echo "This will fix:"
echo "  - Enable RLS on 5 tables (user_activity_log, trending_artists, trending_shows, pipeline_jobs, schema_migrations)"
echo "  - Create appropriate RLS policies for each table"
echo "  - Fix the security definer view issue with cron_job_status"
echo "  - Set up proper service role permissions"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Run the migration
echo "📤 Running migration..."
# The migration file is already in the correct location, just run db push
cd "$(dirname "$0")/.." # Ensure we're in the project root
supabase db push

echo ""
echo "✅ Migration deployed successfully!"
echo ""
echo "🔍 To verify the security fixes, run these queries in Supabase SQL Editor:"
echo ""
echo "-- Check RLS is enabled on all tables:"
echo "SELECT tablename, rowsecurity"
echo "FROM pg_tables"
echo "WHERE schemaname = 'public'"
echo "AND tablename IN ('user_activity_log', 'trending_artists', 'trending_shows', 'pipeline_jobs', 'schema_migrations');"
echo ""
echo "-- Check all policies are created:"
echo "SELECT schemaname, tablename, policyname"
echo "FROM pg_policies"
echo "WHERE schemaname = 'public'"
echo "AND tablename IN ('user_activity_log', 'trending_artists', 'trending_shows', 'pipeline_jobs', 'schema_migrations')"
echo "ORDER BY tablename, policyname;"
echo ""
echo "-- Check view is no longer using security definer:"
echo "SELECT definition"
echo "FROM pg_views"
echo "WHERE viewname = 'cron_job_status';"
echo ""
echo "🧪 Test the policies by:"
echo "1. Testing authenticated user access to their own activity logs"
echo "2. Testing public access to trending data"
echo "3. Testing service role access to all tables"
echo "4. Verifying cron job status view works correctly"