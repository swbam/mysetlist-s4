#!/usr/bin/env node
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const supabaseServiceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase configuration");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TableCheck {
  name: string;
  requiredColumns: string[];
  syncColumns?: string[];
}

const tables: TableCheck[] = [
  {
    name: "artists",
    requiredColumns: [
      "id",
      "name",
      "slug",
      "spotify_id",
      "ticketmaster_id",
      "trending_score",
    ],
    syncColumns: [
      "last_synced_at",
      "last_full_sync_at",
      "created_at",
      "updated_at",
    ],
  },
  {
    name: "shows",
    requiredColumns: [
      "id",
      "name",
      "slug",
      "headliner_artist_id",
      "venue_id",
      "date",
      "trending_score",
    ],
    syncColumns: ["created_at", "updated_at"],
  },
  {
    name: "venues",
    requiredColumns: ["id", "name", "slug", "city", "state"],
    syncColumns: ["created_at", "updated_at"],
  },
  {
    name: "songs",
    requiredColumns: ["id", "title", "spotify_id"],
    syncColumns: ["created_at", "updated_at"],
  },
  {
    name: "setlists",
    requiredColumns: ["id", "show_id", "is_locked"],
    syncColumns: ["created_at", "updated_at"],
  },
  {
    name: "votes",
    requiredColumns: ["id", "user_id", "setlist_song_id"],
    syncColumns: ["created_at"],
  },
  {
    name: "user_activity_log",
    requiredColumns: ["id", "action", "target_type"],
    syncColumns: ["created_at"],
  },
];

async function checkDatabase() {
  console.log("🗄️  Checking database structure and sync status...\n");

  const results = {
    tablesOk: 0,
    tablesMissing: 0,
    columnsOk: 0,
    columnsMissing: 0,
    syncStatus: {
      artists: { total: 0, synced: 0, needsSync: 0 },
      shows: { total: 0, upcoming: 0, completed: 0 },
      venues: { total: 0 },
      recentActivity: { count: 0, lastActivity: null as Date | null },
    },
  };

  // Check each table
  for (const table of tables) {
    console.log(`\n📊 Checking table: ${table.name}`);
    console.log("─".repeat(50));

    try {
      // Get table info
      const { data: columns, error } = await supabase
        .from(table.name)
        .select("*")
        .limit(1);

      if (error) {
        console.log(`   ❌ Table not accessible: ${error.message}`);
        results.tablesMissing++;
        continue;
      }

      results.tablesOk++;
      console.log("   ✅ Table exists");

      // Check columns (if we got data)
      if (columns && columns.length > 0) {
        const columnNames = Object.keys(columns[0]);
        let missingColumns = false;

        for (const reqCol of table.requiredColumns) {
          if (!columnNames.includes(reqCol)) {
            console.log(`   ❌ Missing column: ${reqCol}`);
            results.columnsMissing++;
            missingColumns = true;
          } else {
            results.columnsOk++;
          }
        }

        if (!missingColumns) {
          console.log("   ✅ All required columns present");
        }
      }

      // Get row count and sync status
      const { count, error: countError } = await supabase
        .from(table.name)
        .select("*", { count: "exact", head: true });

      if (!countError && count !== null) {
        console.log(`   📈 Row count: ${count.toLocaleString()}`);

        // Specific checks for each table
        if (table.name === "artists") {
          results.syncStatus.artists.total = count;

          // Check synced artists
          const { count: syncedCount } = await supabase
            .from("artists")
            .select("*", { count: "exact", head: true })
            .not("last_synced_at", "is", null);

          const { count: needsSyncCount } = await supabase
            .from("artists")
            .select("*", { count: "exact", head: true })
            .or(
              "last_synced_at.is.null,last_synced_at.lt.now() - interval '1 day'",
            );

          if (syncedCount !== null)
            results.syncStatus.artists.synced = syncedCount;
          if (needsSyncCount !== null)
            results.syncStatus.artists.needsSync = needsSyncCount;

          console.log(
            `   🔄 Sync status: ${syncedCount}/${count} synced, ${needsSyncCount} need sync`,
          );

          // Get top trending artists
          const { data: trending } = await supabase
            .from("artists")
            .select("name, trending_score")
            .gt("trending_score", 0)
            .order("trending_score", { ascending: false })
            .limit(5);

          if (trending && trending.length > 0) {
            console.log("   🔥 Top trending artists:");
            trending.forEach((artist, i) => {
              console.log(
                `      ${i + 1}. ${artist.name} (score: ${artist.trending_score.toFixed(2)})`,
              );
            });
          }
        }

        if (table.name === "shows") {
          results.syncStatus.shows.total = count;

          const { count: upcomingCount } = await supabase
            .from("shows")
            .select("*", { count: "exact", head: true })
            .eq("status", "upcoming");

          const { count: completedCount } = await supabase
            .from("shows")
            .select("*", { count: "exact", head: true })
            .eq("status", "completed");

          if (upcomingCount !== null)
            results.syncStatus.shows.upcoming = upcomingCount;
          if (completedCount !== null)
            results.syncStatus.shows.completed = completedCount;

          console.log(
            `   📅 Status: ${upcomingCount} upcoming, ${completedCount} completed`,
          );
        }

        if (table.name === "venues") {
          results.syncStatus.venues.total = count;
        }

        if (table.name === "user_activity_log") {
          results.syncStatus.recentActivity.count = count;

          // Get most recent activity
          const { data: recentActivity } = await supabase
            .from("user_activity_log")
            .select("created_at, action, target_type")
            .order("created_at", { ascending: false })
            .limit(5);

          if (recentActivity && recentActivity.length > 0) {
            results.syncStatus.recentActivity.lastActivity = new Date(
              recentActivity[0].created_at,
            );
            console.log("   📝 Recent activity:");
            recentActivity.forEach((activity) => {
              const time = new Date(activity.created_at).toLocaleString();
              console.log(
                `      - ${time}: ${activity.action} on ${activity.target_type}`,
              );
            });
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Error checking table: ${error}`);
      results.tablesMissing++;
    }
  }

  // Summary
  console.log(`\n${"=".repeat(80)}`);
  console.log("📊 DATABASE CHECK SUMMARY");
  console.log("=".repeat(80));

  console.log(`\n✅ Tables: ${results.tablesOk}/${tables.length}`);
  console.log(`✅ Columns: ${results.columnsOk} checked`);
  if (results.columnsMissing > 0) {
    console.log(`❌ Missing columns: ${results.columnsMissing}`);
  }

  console.log("\n🎵 CONTENT STATUS:");
  console.log(
    `   Artists: ${results.syncStatus.artists.total.toLocaleString()} total`,
  );
  console.log(
    `   - Synced: ${results.syncStatus.artists.synced.toLocaleString()}`,
  );
  console.log(
    `   - Need sync: ${results.syncStatus.artists.needsSync.toLocaleString()}`,
  );
  console.log(
    `   Shows: ${results.syncStatus.shows.total.toLocaleString()} total`,
  );
  console.log(
    `   - Upcoming: ${results.syncStatus.shows.upcoming.toLocaleString()}`,
  );
  console.log(
    `   - Completed: ${results.syncStatus.shows.completed.toLocaleString()}`,
  );
  console.log(`   Venues: ${results.syncStatus.venues.total.toLocaleString()}`);

  console.log("\n📈 ACTIVITY:");
  console.log(
    `   Total log entries: ${results.syncStatus.recentActivity.count.toLocaleString()}`,
  );
  if (results.syncStatus.recentActivity.lastActivity) {
    const timeSince =
      Date.now() - results.syncStatus.recentActivity.lastActivity.getTime();
    const minutesSince = Math.floor(timeSince / 60000);
    console.log(`   Last activity: ${minutesSince} minutes ago`);
  }

  // Sync readiness check
  console.log("\n🔄 SYNC SYSTEM STATUS:");
  const syncReady =
    results.tablesOk === tables.length && results.columnsMissing === 0;

  if (syncReady) {
    console.log("   ✅ Database structure is ready for sync");
    if (results.syncStatus.artists.total === 0) {
      console.log(
        "   ⚠️  No artists in database - run initial seed or discovery",
      );
    } else if (
      results.syncStatus.artists.needsSync >
      results.syncStatus.artists.total * 0.5
    ) {
      console.log(
        "   ⚠️  Many artists need syncing - consider running full sync",
      );
    } else {
      console.log("   ✅ Sync system appears healthy");
    }
  } else {
    console.log("   ❌ Database is not ready for sync");
    console.log("   Run database migrations to fix missing tables/columns");
  }

  process.exit(syncReady ? 0 : 1);
}

// Run the check
checkDatabase().catch((error) => {
  console.error("❌ Database check failed:", error);
  process.exit(1);
});
