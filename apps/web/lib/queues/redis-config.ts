import { Redis } from "ioredis";

// Redis connection configuration
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  username?: string;
  db: number;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  connectTimeout: number;
  commandTimeout: number;
  lazyConnect: boolean;
  family: number;
  keepAlive: boolean;
}

const getRedisConfig = (): RedisConfig => {
  // Check for Upstash Redis (Vercel/serverless)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const url = new URL(process.env.UPSTASH_REDIS_REST_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: process.env.UPSTASH_REDIS_REST_TOKEN,
      username: "default",
      db: 0,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      connectTimeout: 10000,
      commandTimeout: 5000,
      lazyConnect: true,
      family: 4,
      keepAlive: true,
    };
  }

  // Standard Redis configuration
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || process.env.REDIS_PASSWORD,
      username: url.username || process.env.REDIS_USERNAME || "default",
      db: parseInt(process.env.REDIS_DB || "0"),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      connectTimeout: 10000,
      commandTimeout: 5000,
      lazyConnect: true,
      family: 4,
      keepAlive: true,
    };
  }

  // Fallback for development
  return {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
    db: parseInt(process.env.REDIS_DB || "0"),
    maxRetriesPerRequest: 1,
    retryDelayOnFailover: 100,
    connectTimeout: 5000,
    commandTimeout: 3000,
    lazyConnect: true,
    family: 4,
    keepAlive: true,
  };
};

// Mock Redis client for development when Redis is not available
class MockRedis {
  async setex(key: string, ttl: number, value: string): Promise<string> {
    console.log(`[Mock Redis] SETEX ${key} ${ttl} ${value.substring(0, 100)}...`);
    return "OK";
  }

  async get(key: string): Promise<string | null> {
    console.log(`[Mock Redis] GET ${key}`);
    return null;
  }

  async publish(channel: string, message: string): Promise<number> {
    console.log(`[Mock Redis] PUBLISH ${channel}: ${message.substring(0, 100)}...`);
    return 1;
  }

  async del(key: string): Promise<number> {
    console.log(`[Mock Redis] DEL ${key}`);
    return 1;
  }

  async exists(key: string): Promise<number> {
    console.log(`[Mock Redis] EXISTS ${key}`);
    return 0;
  }

  async ping(): Promise<string> {
    console.log(`[Mock Redis] PING`);
    return "PONG";
  }

  async quit(): Promise<string> {
    console.log(`[Mock Redis] QUIT`);
    return "OK";
  }
}

export class RedisClientFactory {
  private static clients: Map<string, Redis | MockRedis> = new Map();

  static getClient(type: 'cache' | 'queue' | 'session' = 'cache'): Redis | MockRedis {
    if (this.clients.has(type)) {
      return this.clients.get(type)!;
    }

    let client: Redis | MockRedis;

    // Check if Redis is configured
    const hasRedisConfig = !!(
      process.env.REDIS_URL || 
      process.env.UPSTASH_REDIS_REST_URL || 
      process.env.REDIS_HOST
    );

    if (hasRedisConfig) {
      try {
        const config = getRedisConfig();
        client = new Redis(config);
        
        // Set up error handling
        client.on('error', (error) => {
          console.error(`Redis ${type} client error:`, error);
        });

        client.on('connect', () => {
          console.log(`✅ Redis ${type} client connected`);
        });

        client.on('ready', () => {
          console.log(`✅ Redis ${type} client ready`);
        });

        client.on('close', () => {
          console.log(`⚠️  Redis ${type} client connection closed`);
        });

      } catch (error) {
        console.warn(`⚠️  Failed to create Redis ${type} client, using mock:`, error);
        client = new MockRedis();
      }
    } else {
      console.warn(`⚠️  Redis not configured for ${type}, using mock client`);
      client = new MockRedis();
    }

    this.clients.set(type, client);
    return client;
  }

  static async closeAll(): Promise<void> {
    const promises = Array.from(this.clients.values()).map(async (client) => {
      if (client instanceof Redis) {
        try {
          await client.quit();
        } catch (error) {
          console.warn('Error closing Redis client:', error);
        }
      }
    });

    await Promise.all(promises);
    this.clients.clear();
    console.log('✅ All Redis clients closed');
  }

  static async testConnection(type: 'cache' | 'queue' | 'session' = 'cache'): Promise<boolean> {
    try {
      const client = this.getClient(type);
      const result = await client.ping();
      return result === "PONG";
    } catch (error) {
      console.error(`Redis ${type} connection test failed:`, error);
      return false;
    }
  }
}

// Export for backward compatibility
export const getRedisConnection = () => getRedisConfig();

// Graceful shutdown handler
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing Redis connections...');
    await RedisClientFactory.closeAll();
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, closing Redis connections...');
    await RedisClientFactory.closeAll();
  });
}