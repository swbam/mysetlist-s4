// Remove server-only import to allow client usage
// import 'server-only';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy initialization to avoid errors during build time
let _db: ReturnType<typeof drizzle> | null = null;
let _client: postgres.Sql | null = null;

// Get database URL from environment variables
function getDatabaseUrl(): string {
  // Try env first
  const url = process.env["DATABASE_URL"] || process.env["DIRECT_URL"];

  // Throw error if not found - never use hardcoded credentials
  if (!url) {
    throw new Error(
      "DATABASE_URL or DIRECT_URL must be set in environment variables. " +
        "Please check your .env.local file and ensure database credentials are properly configured.",
    );
  }

  return url;
}

export function getDb() {
  if (_db) {
    return _db;
  }

  const connectionString = getDatabaseUrl();

  _client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: "require",
    prepare: false, // Disable prepared statements for Supabase pooler
  });

  _db = drizzle(_client, {
    schema,
    logger: process.env["NODE_ENV"] === "development",
  });

  return _db;
}

// Export a proxy that initializes on first use
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    const actualDb = getDb();
    const value = Reflect.get(actualDb, prop, receiver);

    // If it's a function, bind it to the actual db instance
    if (typeof value === "function") {
      return value.bind(actualDb);
    }

    return value;
  },
  has(_target, prop) {
    try {
      const actualDb = getDb();
      return Reflect.has(actualDb, prop);
    } catch (_error) {
      return false;
    }
  },
  getPrototypeOf(_target) {
    const actualDb = getDb();
    return Reflect.getPrototypeOf(actualDb);
  },
  ownKeys(_target) {
    const actualDb = getDb();
    return Reflect.ownKeys(actualDb);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const actualDb = getDb();
    return Reflect.getOwnPropertyDescriptor(actualDb, prop);
  },
});

// Migration client with lazy init
let _migrationClient: postgres.Sql | null = null;

export const migrationClient = new Proxy({} as postgres.Sql, {
  get(_target, prop) {
    if (!_migrationClient) {
      const connectionString = getDatabaseUrl();

      _migrationClient = postgres(connectionString, {
        max: 1,
        ssl: "require", // Always use SSL for Supabase
        prepare: false, // Disable prepared statements for Supabase pooler
      });
    }

    return _migrationClient[prop as keyof typeof _migrationClient];
  },
});

// Re-export commonly used functions
export {
  sql,
  eq,
  and,
  or,
  desc,
  asc,
  ilike,
  isNull,
  isNotNull,
} from "drizzle-orm";

export type Database = ReturnType<typeof getDb>;
