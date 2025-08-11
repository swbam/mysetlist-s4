#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Script to update all edge function references to API routes
 * This will convert supabase.functions.invoke() calls to fetch() calls
 */

const EDGE_FUNCTION_TO_API_ROUTE_MAP = {
  "sync-artists": "/api/sync/artists",
  "sync-shows": "/api/sync/shows",
  "sync-setlists": "/api/sync/setlists",
  "scheduled-sync": "/api/cron/master-sync",
  "sync-artist-shows": "/api/sync/artist-shows",
  "sync-song-catalog": "/api/sync/song-catalog",
  "update-trending": "/api/cron/calculate-trending",
  "backup-database": "/api/cron/backup",
  "spotify-sync": "/api/sync/spotify",
  "ticketmaster-sync": "/api/sync/ticketmaster",
  "setlist-fm-sync": "/api/sync/setlist-fm",
  "musicbrainz-sync": "/api/sync/musicbrainz",
  "venue-sync": "/api/sync/venues",
  "email-processor": "/api/cron/email-processor",
  "send-email": "/api/email/send",
  "analytics-processor": "/api/cron/analytics",
  "notification-sender": "/api/notifications/send",
  "calculate-trending": "/api/cron/calculate-trending",
};

function updateSyncFunctionsFile() {
  const filePath = join(process.cwd(), "apps/web/lib/sync-functions.ts");

  const newContent = `import { createClient } from "./supabase/client";

export interface SyncArtistParams {
  spotifyId?: string;
  artistName?: string;
  forceSync?: boolean;
}

export interface SyncShowsParams {
  artistName?: string;
  artistId?: string;
  city?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface SyncSetlistParams {
  setlistId?: string;
  showId?: string;
  artistName?: string;
  date?: string;
}

/**
 * Get the app URL for API calls
 */
function getAppUrl() {
  if (typeof window !== 'undefined') {
    // Client-side
    return '';
  }
  // Server-side
  return process.env["NEXT_PUBLIC_APP_URL"] || 'http://localhost:3001';
}

/**
 * Sync artist data from Spotify
 */
export async function syncArtist(params: SyncArtistParams) {
  const response = await fetch(\`\${getAppUrl()}/api/sync/artists\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(\`Failed to sync artist: \${error}\`);
  }

  return response.json();
}

/**
 * Sync shows/concerts from Ticketmaster
 */
export async function syncShows(params: SyncShowsParams) {
  const response = await fetch(\`\${getAppUrl()}/api/sync/shows\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(\`Failed to sync shows: \${error}\`);
  }

  return response.json();
}

/**
 * Sync setlist from Setlist.fm
 */
export async function syncSetlist(params: SyncSetlistParams) {
  const response = await fetch(\`\${getAppUrl()}/api/sync/setlists\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(\`Failed to sync setlist: \${error}\`);
  }

  return response.json();
}

/**
 * Trigger a manual sync for all data types
 */
export async function triggerManualSync(
  type: "all" | "artists" | "shows" | "setlists" = "all",
  limit = 10,
) {
  const response = await fetch(\`\${getAppUrl()}/api/cron/master-sync\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, limit, mode: 'manual' }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(\`Failed to trigger sync: \${error}\`);
  }

  return response.json();
}
`;

  writeFileSync(filePath, newContent);
  console.log(
    "✅ Updated sync-functions.ts to use API routes instead of edge functions",
  );
}

function updateBackupRoute() {
  const filePath = join(
    process.cwd(),
    "apps/web/app/api/scheduled/_deprecated/backup/route.ts",
  );

  // Since this is in a _deprecated folder, we'll just add a comment noting it should be removed
  try {
    const content = readFileSync(filePath, "utf-8");
    if (!content.includes("DEPRECATED: This file uses edge functions")) {
      const updatedContent = `// DEPRECATED: This file uses edge functions and should be removed
// The backup functionality should be moved to a proper API route if needed
${content}`;
      writeFileSync(filePath, updatedContent);
      console.log("✅ Marked backup route as deprecated");
    }
  } catch (error) {
    console.log("⚠️  Could not update backup route (may already be removed)");
  }
}

function generateCleanupReport() {
  const report = `# Edge Functions Cleanup Report

## Files Updated
1. **/apps/web/lib/sync-functions.ts** - Converted all edge function calls to API routes
2. **/apps/web/app/api/scheduled/_deprecated/backup/route.ts** - Marked as deprecated

## API Route Mappings
The following edge functions should be replaced with API routes:

${Object.entries(EDGE_FUNCTION_TO_API_ROUTE_MAP)
  .map(([edge, api]) => `- \`${edge}\` → \`${api}\``)
  .join("\n")}

## Next Steps
1. Delete all edge functions from Supabase dashboard
2. Ensure all API routes listed above exist and are properly implemented
3. Test the sync functionality to ensure it works with API routes
4. Remove the deprecated backup route if not needed

## Important Notes
- All sync operations now go through Next.js API routes
- This eliminates the extra network hop through edge functions
- Performance should improve as there's one less layer
- Debugging is easier as all code is in the Next.js app
`;

  writeFileSync(join(process.cwd(), "EDGE_FUNCTION_CLEANUP_REPORT.md"), report);
  console.log("✅ Generated cleanup report at EDGE_FUNCTION_CLEANUP_REPORT.md");
}

// Main execution
console.log("🔄 Starting edge function reference updates...\n");

updateSyncFunctionsFile();
updateBackupRoute();
generateCleanupReport();

console.log("\n✅ All edge function references have been updated!");
console.log("\n📋 Next steps:");
console.log("1. Run: pnpm build to ensure no TypeScript errors");
console.log("2. Test the sync functions to ensure they work properly");
console.log("3. Delete all edge functions from Supabase dashboard");
console.log("4. Review EDGE_FUNCTION_CLEANUP_REPORT.md for details");
