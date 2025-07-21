import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from './env';

// Lazy initialization
let _db: ReturnType<typeof drizzle> | null = null;
let _client: postgres.Sql | null = null;

export function getDb() {
  if (_db) {
    return _db;
  }

  _client = postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: 'require',
  });

  _db = drizzle(_client, {
    logger: env.NODE_ENV === 'development',
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