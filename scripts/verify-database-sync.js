#!/usr/bin/env node

/**
 * Database Data Verification Script
 * Checks if the sync system is creating data correctly
 */

const { createClient } = require("@supabase/supabase-js");

// Database client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function checkTableData() {
  console.log("🗄️  Database Data Verification");
  console.log("=".repeat(50));
  console.log("");

  const tables = {
    artists: "Artists table",
    shows: "Shows/concerts table",
    setlists: "Setlists table",
    songs: "Songs table",
    venues: "Venues table",
    votes: "Votes table",
    cron_job_logs: "Cron job logs",
  };

  const results = {};
  let hasAnyData = false;

  for (const [tableName, description] of Object.entries(tables)) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: true });

      if (error) {
        results[tableName] = { error: error.message, status: "❌" };
        console.log(`❌ ${description}: Error - ${error.message}`);
      } else {
        const recordCount = count || 0;
        const hasData = recordCount > 0;
        hasAnyData = hasAnyData || hasData;

        results[tableName] = {
          count: recordCount,
          hasData,
          status: hasData ? "✅" : "⚠️ ",
        };
        console.log(
          `${hasData ? "✅" : "⚠️ "} ${description}: ${recordCount} records`,
        );
      }
    } catch (error) {
      results[tableName] = { error: error.message, status: "❌" };
      console.log(`❌ ${description}: Exception - ${error.message}`);
    }
  }

  return { results, hasAnyData };
}

async function checkRecentActivity() {
  console.log("");
  console.log("📊 Recent Activity Check");
  console.log("=".repeat(30));

  try {
    // Check recent cron job logs
    const { data: recentLogs, error: logsError } = await supabase
      .from("cron_job_logs")
      .select("job_name, status, message, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!logsError && recentLogs && recentLogs.length > 0) {
      console.log("🕐 Recent cron job executions:");
      recentLogs.forEach((log) => {
        const time = new Date(log.created_at).toLocaleString();
        const status = log.status === "completed" ? "✅" : "❌";
        console.log(`   ${status} ${log.job_name} - ${time}`);
        console.log(`      ${log.message}`);
      });
    } else {
      console.log("⚠️  No recent cron job logs found");
    }

    // Check if there are any artists with recent activity
    const { data: recentArtists, error: artistsError } = await supabase
      .from("artists")
      .select("name, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(3);

    if (!artistsError && recentArtists && recentArtists.length > 0) {
      console.log("");
      console.log("🎵 Recently added artists:");
      recentArtists.forEach((artist) => {
        const time = new Date(artist.created_at).toLocaleString();
        console.log(`   • ${artist.name} - ${time}`);
      });
    }
  } catch (error) {
    console.log(`❌ Error checking recent activity: ${error.message}`);
  }
}

async function checkDataIntegrity() {
  console.log("");
  console.log("🔍 Data Integrity Check");
  console.log("=".repeat(30));

  const checks = [
    {
      name: "Artists with shows",
      query: `
        SELECT COUNT(DISTINCT a.id) as artist_count, COUNT(s.id) as show_count
        FROM artists a
        LEFT JOIN shows s ON a.id = s.headliner_artist_id
        WHERE a.created_at > NOW() - INTERVAL '7 days'
      `,
    },
    {
      name: "Shows with setlists",
      query: `
        SELECT COUNT(sh.id) as total_shows, COUNT(sl.id) as shows_with_setlists
        FROM shows sh
        LEFT JOIN setlists sl ON sh.id = sl.show_id
        WHERE sh.created_at > NOW() - INTERVAL '7 days'
      `,
    },
  ];

  for (const check of checks) {
    try {
      const { data, error } = await supabase.rpc("exec_sql", {
        sql: check.query,
      });

      if (!error && data && data.length > 0) {
        console.log(`✅ ${check.name}:`, data[0]);
      } else {
        console.log(`⚠️  ${check.name}: Could not verify`);
      }
    } catch (error) {
      console.log(`❌ ${check.name}: Error - ${error.message}`);
    }
  }
}

async function runVerification() {
  console.log("🚀 TheSet Database Verification");
  console.log("");

  // Check basic table data
  const tableCheck = await checkTableData();

  // Check recent activity
  await checkRecentActivity();

  // Check data integrity
  await checkDataIntegrity();

  // Summary
  console.log("");
  console.log("📋 Summary");
  console.log("=".repeat(20));

  if (tableCheck.hasAnyData) {
    console.log("✅ Database contains data");
    console.log("✅ Sync system appears to be functioning");
  } else {
    console.log("⚠️  Database appears empty or sync system may not be working");
    console.log("");
    console.log("💡 Suggestions:");
    console.log(
      "   1. Run artist import: node scripts/test-artist-import-simple.js",
    );
    console.log("   2. Trigger manual sync: Run cron jobs manually");
    console.log("   3. Check API endpoints are accessible");
  }

  return tableCheck.hasAnyData;
}

// Run verification
if (require.main === module) {
  runVerification()
    .then((success) => {
      console.log("");
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Verification failed:", error.message);
      process.exit(1);
    });
}

module.exports = { runVerification };
