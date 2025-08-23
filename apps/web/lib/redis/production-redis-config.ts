import { Redis } from "ioredis";
import { ConnectionOptions } from "bullmq";
import { CircuitBreaker } from "~/lib/services/circuit-breaker";

// Redis circuit breaker for connection resilience
const redisCircuitBreaker = new CircuitBreaker('Redis', {
  failureThreshold: 3,
  resetTimeout: 10000, // 10 seconds
  monitoringPeriod: 60000, // 1 minute
  halfOpenLimit: 1
});

// Production Redis configuration with fallback and error handling
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  username?: string;
  db?: number;
  maxRetriesPerRequest?: number | null;
  retryDelayOnFailover?: number;
  connectTimeout?: number;
  commandTimeout?: number;
  lazyConnect?: boolean;
  family?: number;
  keepAlive?: boolean;
  enableReadyCheck?: boolean;
  reconnectOnError?: (err: Error) => boolean;
  retryStrategy?: (times: number) => number | void;
  tls?: any;
}

// Build Redis configuration from environment
function buildRedisConfig(): RedisConfig {
  const { 
    REDIS_URL,
    REDIS_HOST,
    REDIS_PORT,
    REDIS_USERNAME,
    REDIS_PASSWORD,
    REDIS_TLS,
    REDIS_DB,
    NODE_ENV
  } = process.env;

  // Parse Redis URL if provided
  if (REDIS_URL) {
    const url = new URL(REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      ...(url.password && { password: url.password }),
      ...(url.username && { username: url.username }),
      db: parseInt(url.pathname.slice(1) || '0'),
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
      family: 4,
      keepAlive: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnFailover: 100,
      reconnectOnError: (err) => {
        console.log("Redis reconnect on error:", err.message);
        // Reconnect on READONLY errors (failover scenarios)
        return err.message.includes("READONLY");
      },
      retryStrategy: (times) => {
        if (times > 10) {
          console.error("Redis connection failed after 10 retries");
          return undefined;
        }
        const delay = Math.min(times * 100, 3000);
        console.log(`Retrying Redis connection in ${delay}ms...`);
        return delay;
      },
      tls: REDIS_TLS === 'true' ? {} : undefined
    };
  }

  // Fallback to individual environment variables
  return {
    host: REDIS_HOST || (NODE_ENV === 'production' ? 'redis' : 'localhost'),
    port: parseInt(REDIS_PORT || '6379'),
    username: REDIS_USERNAME,
    password: REDIS_PASSWORD,
    db: parseInt(REDIS_DB || '0'),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    family: 4,
    keepAlive: true,
    connectTimeout: NODE_ENV === 'production' ? 10000 : 5000,
    commandTimeout: NODE_ENV === 'production' ? 5000 : 3000,
    retryDelayOnFailover: 100,
    reconnectOnError: (err) => {
      return err.message.includes("READONLY");
    },
    retryStrategy: (times) => {
      if (times > (NODE_ENV === 'production' ? 10 : 5)) {
        return undefined;
      }
      return Math.min(times * 100, 3000);
    },
    tls: REDIS_TLS === 'true' ? {} : undefined
  };
}

// Create Redis client with circuit breaker protection
export async function createRedisClient(): Promise<Redis> {
  return redisCircuitBreaker.execute(async () => {
    const config = buildRedisConfig();
    const client = new Redis(config as any);

    // Set up event handlers
    client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    client.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });

    client.on('close', () => {
      console.log('🔌 Redis connection closed');
    });

    client.on('reconnecting', (delay: number) => {
      console.log(`🔄 Redis reconnecting in ${delay}ms...`);
    });

    // Wait for connection with timeout
    if (!config.lazyConnect) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout'));
        }, config.connectTimeout || 10000);

        client.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        client.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }

    return client;
  });
}

// BullMQ-specific connection configuration
export const bullMQConnection: ConnectionOptions = {
  ...buildRedisConfig(),
  maxRetriesPerRequest: null, // Required for BullMQ
  enableOfflineQueue: true,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    if (times > 10) {
      console.error("BullMQ Redis connection failed after 10 retries");
      return null;
    }
    return Math.min(times * 100, 3000);
  }
} as any;

// Get Redis connection for BullMQ with fallback
export function getRedisConnection(): ConnectionOptions {
  const { NODE_ENV, REDIS_ENABLED } = process.env;
  
  // Allow disabling Redis in development
  if (NODE_ENV === 'development' && REDIS_ENABLED === 'false') {
    console.warn('⚠️  Redis disabled in development - using memory fallback');
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      commandTimeout: 1000,
      lazyConnect: true
    };
  }

  return bullMQConnection;
}

// Singleton instances for pub/sub
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

export async function getRedisPubClient(): Promise<Redis> {
  if (!pubClient) {
    pubClient = await createRedisClient();
  }
  return pubClient;
}

export async function getRedisSubClient(): Promise<Redis> {
  if (!subClient) {
    subClient = await createRedisClient();
  }
  return subClient;
}

// Production cache manager with connection pooling
export class ProductionRedisCache {
  private client: Redis | null = null;
  private connectionPromise: Promise<Redis> | null = null;

  async getClient(): Promise<Redis> {
    if (this.client && this.client.status === 'ready') {
      return this.client;
    }

    if (!this.connectionPromise) {
      this.connectionPromise = createRedisClient();
    }

    this.client = await this.connectionPromise;
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const client = await this.getClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const client = await this.getClient();
      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, serialized);
      } else {
        await client.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      console.error(`Redis cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const result = await client.del(key);
      return result > 0;
    } catch (error) {
      console.error(`Redis cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async increment(key: string, by: number = 1): Promise<number> {
    try {
      const client = await this.getClient();
      return await client.incrby(key, by);
    } catch (error) {
      console.error(`Redis cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const client = await this.getClient();
      const result = await client.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      console.error(`Redis cache expire error for key ${key}:`, error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const client = await this.getClient();
      const keys = await client.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const pipeline = client.pipeline();
      keys.forEach(key => pipeline.del(key));
      const results = await pipeline.exec();
      
      return results?.length || 0;
    } catch (error) {
      console.error(`Redis cache pattern invalidation error for ${pattern}:`, error);
      return 0;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connectionPromise = null;
    }
  }
}

// Export singleton instance
export const redisCache = new ProductionRedisCache();

// Cleanup function for graceful shutdown
export async function closeRedisConnections(): Promise<void> {
  const promises: Promise<any>[] = [];
  
  if (pubClient) {
    promises.push(pubClient.quit());
    pubClient = null;
  }
  
  if (subClient) {
    promises.push(subClient.quit());
    subClient = null;
  }
  
  promises.push(redisCache.close());
  
  await Promise.all(promises);
  console.log('✅ All Redis connections closed');
}

// Handle process shutdown gracefully
if (process.env.NODE_ENV === 'production') {
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, closing Redis connections...');
    await closeRedisConnections();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, closing Redis connections...');
    await closeRedisConnections();
    process.exit(0);
  });
}
