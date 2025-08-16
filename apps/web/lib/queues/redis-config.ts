import { Redis } from "ioredis";
import { ConnectionOptions } from "bullmq";

// Redis connection configuration with your credentials
export const redisConfig = {
  username: 'default',
  password: 'D0ph9gV9LPCbAq271oij61iRaoqnK3o6',
  host: 'redis-15718.c44.us-east-1-2.ec2.redns.redis-cloud.com',
  port: 15718,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// BullMQ connection configuration
export const bullMQConnection: ConnectionOptions = {
  username: 'default',
  password: 'D0ph9gV9LPCbAq271oij61iRaoqnK3o6',
  host: 'redis-15718.c44.us-east-1-2.ec2.redns.redis-cloud.com',
  port: 15718,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Create Redis client for direct operations
export const createRedisClient = () => {
  return new Redis(redisConfig);
};

// Singleton Redis client for pub/sub
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

export const getRedisPubClient = (): Redis => {
  if (!pubClient) {
    pubClient = createRedisClient();
  }
  return pubClient;
};

export const getRedisSubClient = (): Redis => {
  if (!subClient) {
    subClient = createRedisClient();
  }
  return subClient;
};

// Cache operations with TTL
export class RedisCache {
  private client: Redis;
  
  constructor() {
    this.client = createRedisClient();
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis cache get error for key ${key}:`, error);
      return null;
    }
  }
  
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error(`Redis cache set error for key ${key}:`, error);
    }
  }
  
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Redis cache delete error for key ${key}:`, error);
    }
  }
  
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis cache exists error for key ${key}:`, error);
      return false;
    }
  }
  
  async increment(key: string, by: number = 1): Promise<number> {
    try {
      return await this.client.incrby(key, by);
    } catch (error) {
      console.error(`Redis cache increment error for key ${key}:`, error);
      return 0;
    }
  }
  
  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.expire(key, ttlSeconds);
    } catch (error) {
      console.error(`Redis cache expire error for key ${key}:`, error);
    }
  }
  
  async close(): Promise<void> {
    await this.client.quit();
  }
}

// Cleanup function
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
  
  await Promise.all(promises);
}