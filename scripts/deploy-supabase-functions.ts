#!/usr/bin/env tsx
/**
 * Supabase Edge Functions Deployment Script
 *
 * NOTE: All edge functions have been removed from this project.
 * Their functionality has been migrated to API routes in /apps/web/app/api/
 *
 * This file is kept for reference but no longer performs any deployments.
 */

console.log("ℹ️  Supabase Edge Functions have been removed from this project.");
console.log("   All sync functionality is now handled by API routes:");
console.log("   - /api/cron/master-sync - Main sync orchestrator");
console.log("   - /api/sync/artists - Artist data sync");
console.log("   - /api/sync/shows - Show data sync");
console.log("   - /api/sync/songs - Song catalog sync");
console.log("   - /api/cron/trending - Trending updates");
console.log("\n   Cron jobs are configured to call these API routes directly.");
console.log("   See migration: 20250729_fix_cron_jobs_edge_functions.sql");

process.exit(0);
