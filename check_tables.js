const postgres = require("postgres");

const connectionString =
  "postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require";
const sql = postgres(connectionString);

async function checkTables() {
  try {
    // Check if import_status table exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('import_status', 'artists', 'shows', 'songs')
      ORDER BY table_name
    `;

    console.log(
      "Existing tables:",
      tables.map((t) => t.table_name),
    );

    // Show import_status table structure if it exists
    if (tables.some((t) => t.table_name === "import_status")) {
      const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'import_status'
        ORDER BY ordinal_position
      `;
      console.log("\nimport_status table columns:");
      columns.forEach((col) => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }

    await sql.end();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkTables();
