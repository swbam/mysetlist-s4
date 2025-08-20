const postgres = require("postgres");

const connectionString =
  "postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require";
const sql = postgres(connectionString);

async function checkImportStatus() {
  try {
    // Check import status
    const importStatuses = await sql`
      SELECT artist_id, stage, percentage, message, error, started_at, completed_at, created_at, updated_at
      FROM import_status
      ORDER BY updated_at DESC
      LIMIT 10
    `;

    console.log("Recent import statuses:", importStatuses.length);
    if (importStatuses.length > 0) {
      importStatuses.forEach((status) => {
        console.log(
          `  - Artist ID: ${status.artist_id}, Stage: ${status.stage}, Progress: ${status.percentage}%, Message: ${status.message}`,
        );
        if (status.error) console.log(`    Error: ${status.error}`);
      });
    }

    // Check for Our Last Night in import status
    const ourLastNightStatus = await sql`
      SELECT artist_id, stage, percentage, message, error, started_at, completed_at
      FROM import_status
      WHERE message ILIKE '%our last night%' OR artist_id::text LIKE '%tmp_K8vZ917GtG0%'
      ORDER BY updated_at DESC
    `;

    console.log("\nOur Last Night import statuses:", ourLastNightStatus.length);
    if (ourLastNightStatus.length > 0) {
      ourLastNightStatus.forEach((status) => {
        console.log(
          `  - Artist ID: ${status.artist_id}, Stage: ${status.stage}, Progress: ${status.percentage}%, Message: ${status.message}`,
        );
        if (status.error) console.log(`    Error: ${status.error}`);
      });
    }

    await sql.end();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkImportStatus();
