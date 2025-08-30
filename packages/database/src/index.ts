import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Get database URL from environment variables
const databaseUrl = process.env['DATABASE_URL'] || process.env['DIRECT_URL'];

// Ensure we have a database URL
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or DIRECT_URL must be set in environment variables. " +
      "Please check your .env.local file and ensure database credentials are properly configured.",
  );
}

const globalForDrizzle = global as unknown as {
  db: ReturnType<typeof drizzle> | undefined;
  client: ReturnType<typeof postgres> | undefined;
};

// Create postgres client with error handling
let client: ReturnType<typeof postgres>;
try {
  client =
    globalForDrizzle.client ??
    postgres(databaseUrl, {
      max: 20, // increased connection pool size for better concurrency
      idle_timeout: 30, // increased from 20
      connect_timeout: 30, // increased from 10 to handle slow connections
      ssl: "require", // Always use SSL for Supabase
      prepare: false, // disable prepared statements for Supabase pooler
      connection: {
        application_name: 'mysetlist_app', // better connection tracking
      },
    });

  if (process.env['NODE_ENV'] !== "production") {
    globalForDrizzle.client = client;
  }
} catch (error) {
  console.error("Failed to create postgres client:", error);
  throw new Error("Database connection failed. Please check DATABASE_URL");
}

// Create drizzle instance
export const db = globalForDrizzle.db ?? drizzle(client, { schema });

if (process.env['NODE_ENV'] !== "production") globalForDrizzle.db = db;

// Export a function to test the connection
export async function testConnection() {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}


export * from "./schema";
export * from "./utils/growth-calculation";

// Re-export commonly used query helpers for consumers that directly map to this file via TS path mapping
export { sql, eq, and, or, desc, asc, ilike, isNull, isNotNull, inArray } from "drizzle-orm";
export * from "./schema/admin";
