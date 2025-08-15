import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Use dynamic import to handle env import issues
let databaseUrl: string | undefined;

try {
  // Try to import env package
  const envModule = require("@repo/env");
  databaseUrl = envModule.env?.DATABASE_URL;
} catch (error) {
  // Fallback to process.env if @repo/env is not available
  console.warn("Failed to import @repo/env, falling back to process.env");
}

// Use fallback DATABASE_URL if not available from env
if (!databaseUrl) {
  databaseUrl = process.env['DATABASE_URL'] || process.env['DIRECT_URL'];
}

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
      max: 10, // connection pool size
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: "require", // Always use SSL for Supabase
      prepare: false, // disable prepared statements for Supabase pooler
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
