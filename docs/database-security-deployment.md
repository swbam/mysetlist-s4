# Database Security Deployment Guide

This guide explains how to deploy the database security fixes that address RLS (Row Level Security) issues and the security definer view problem.

## Overview

The security migration fixes the following issues:
1. **Missing RLS** on 5 tables: `user_activity_log`, `trending_artists`, `trending_shows`, `pipeline_jobs`, `schema_migrations`
2. **Security Definer View**: Removes security definer from `cron_job_status` view
3. **Missing Policies**: Creates appropriate RLS policies for each table

## Files Created

1. **Migration File**: `/supabase/migrations/20250128_security_fixes.sql`
   - Contains all SQL commands to fix security issues
   - Enables RLS and creates policies
   - Recreates view without security definer

2. **Deployment Script**: `/scripts/deploy-security-migration.sh`
   - Bash script to run the migration using Supabase CLI
   - Provides verification queries

3. **Test Script**: `/scripts/test-security-fixes.ts`
   - TypeScript test suite to verify all security fixes
   - Tests RLS, policies, and view permissions

## Deployment Steps

### Option 1: Using npm Scripts (Recommended)

```bash
# Deploy the security migration
pnpm deploy:security

# Test the security fixes
pnpm test:security
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `/supabase/migrations/20250128_security_fixes.sql`
4. Paste and run in the SQL Editor
5. Verify using the test queries provided

### Option 3: Using Supabase CLI Directly

```bash
# Make sure you're in the project root
cd /Users/seth/mysetlist-s4-1

# Run the migration
supabase db push --file supabase/migrations/20250128_security_fixes.sql

# Or using the script directly
./scripts/deploy-security-migration.sh
```

## Verification

After deployment, verify the fixes by running:

```bash
pnpm test:security
```

This will test:
- ✅ RLS is enabled on all 5 tables
- ✅ Anonymous users can read trending data
- ✅ Anonymous users cannot write to protected tables
- ✅ Authenticated users can only see their own activity logs
- ✅ Service role has full access to all tables
- ✅ Cron job status view works without security definer

## Manual Verification Queries

If you prefer to verify manually in the Supabase SQL Editor:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_activity_log', 'trending_artists', 'trending_shows', 'pipeline_jobs', 'schema_migrations');

-- Check policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_activity_log', 'trending_artists', 'trending_shows', 'pipeline_jobs', 'schema_migrations')
ORDER BY tablename, policyname;

-- Check view is not security definer
SELECT definition
FROM pg_views
WHERE viewname = 'cron_job_status';
```

## Expected Results

After successful deployment:
- All 5 tables should have `rowsecurity = true`
- Each table should have appropriate policies (1-2 policies per table)
- The `cron_job_status` view definition should NOT contain "SECURITY DEFINER"
- All security tests should pass

## Troubleshooting

If you encounter issues:

1. **Permission Denied**: Make sure you're using the service role key for deployment
2. **Policy Already Exists**: The migration is idempotent, but if policies exist with different names, drop them first
3. **View Recreation Fails**: Drop the view manually first if it has dependencies

## Security Best Practices

After deployment:
1. Always use RLS on new tables
2. Create policies immediately after table creation
3. Test policies with different user roles
4. Avoid security definer views unless absolutely necessary
5. Regular security audits using the test script