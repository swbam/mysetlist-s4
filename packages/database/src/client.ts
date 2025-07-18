// Remove server-only import to allow client usage
// import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Lazy initialization to avoid errors during build time
let _db: ReturnType<typeof drizzle> | null = null;
let _client: postgres.Sql | null = null;

export function getDb() {
  if (_db) {
    return _db;
  }

  const connectionString = process.env['DATABASE_URL'];

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not configured. Please set it in your .env.local file.'
    );
  }
  _client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: process.env['NODE_ENV'] === 'production' ? 'require' : false,
  });

  _db = drizzle(_client, {
    schema,
    logger: process.env['NODE_ENV'] === 'development',
  });

  return _db;
}

// Export a proxy that initializes on first use
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    const actualDb = getDb();
    const value = Reflect.get(actualDb, prop, receiver);

    // If it's a function, bind it to the actual db instance
    if (typeof value === 'function') {
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
      const connectionString = process.env['DATABASE_URL'];

      if (!connectionString) {
        throw new Error('DATABASE_URL is required for migrations');
      }

      _migrationClient = postgres(connectionString, {
        max: 1,
        ssl: process.env['NODE_ENV'] === 'production' ? 'require' : false,
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
} from 'drizzle-orm';

export type Database = ReturnType<typeof getDb>;
