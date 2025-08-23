// MySetlist-S4 Production Redis Configuration
// File: apps/web/lib/queues/redis-config.ts
// Production-ready Redis configuration with error handling and connection pooling

import Redis from 'ioredis';
import { ConnectionOptions } from 'bullmq';

// Redis configuration based on environment
const getRedisUrl = (): string => {
  if (process.env.NODE_ENV === 'production') {
    const redisUrl = process.env['REDIS_URL'];
    if (!redisUrl) {
      throw new Error('REDIS_URL is required in production');
    }
    return redisUrl;
  }
  
  // Development defaults
  return process.env['REDIS_URL'] || 'redis://localhost:6379';
};

// Parse Redis URL into connection options
const parseRedisUrl = (url: string): any => {
  try {
    const redisUrl = new URL(url);
    
    return {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port || '6379'),
      password: redisUrl.password || undefined,
      username: (redisUrl.username || undefined) as any,
      db: parseInt(redisUrl.pathname?.slice(1) || '0'),
      family: 4, // Force IPv4
      
      // Production optimizations
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.error('Redis connection failed after 3 attempts');
          return null; // Stop retrying
        }
        return Math.min(times * 500, 2000); // exponential backoff
      },
      
      // Performance settings
      enableOfflineQueue: (process.env.NODE_ENV !== 'production') as any,
      connectTimeout: 10000,
      disconnectTimeout: 2000,
      commandTimeout: 5000,
      
      // Reconnection settings
      reconnectOnError: (err: Error) => {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        return targetErrors.some(e => err.message.includes(e));
      },
    };
  } catch (error) {
    console.error('Failed to parse Redis URL:', error);
    throw new Error('Invalid REDIS_URL format');
  }
};

// BullMQ connection configuration
export const getRedisConnection = (): ConnectionOptions => {
  const redisUrl = getRedisUrl();
  const options = parseRedisUrl(redisUrl);
  
  return {
    host: options.host!,
    port: options.port!,
    password: options.password,
    username: options.username as any,
    db: options.db,
    maxRetriesPerRequest: null as any,
    retryStrategy: (times: number) => (times > 10 ? null : Math.min(times * 1000, 30000)) as any,
  } as any;
};

// Separate connection for BullMQ (recommended for production)
export const getBullMQConnection = (): ConnectionOptions => {
  const baseConfig = getRedisConnection();
  return baseConfig;
};

// Redis client factory for different purposes
export class RedisClientFactory {
  private static clients: Map<string, Redis> = new Map();

  static getClient(purpose: 'queue' | 'cache' | 'pubsub' = 'cache'): Redis {
    if (this.clients.has(purpose)) {
      return this.clients.get(purpose)!;
    }

    const url = getRedisUrl();
    const client = new Redis(url, { maxRetriesPerRequest: null as any, enableReadyCheck: false as any });

    // Set up event listeners
    client.on('connect', () => {
      console.log(`Redis client connected for ${purpose}`);
    });

    client.on('error', (error) => {
      console.error(`Redis client error for ${purpose}:`, error);
    });

    client.on('close', () => {
      console.log(`Redis client closed for ${purpose}`);
    });

    client.on('reconnecting', () => {
      console.log(`Redis client reconnecting for ${purpose}`);
    });

    this.clients.set(purpose, client);
    return client;
  }

  static async closeAll(): Promise<void> {
    const promises: Promise<unknown>[] = [];
    
    for (const [purpose, client] of this.clients) {
      console.log(`Closing Redis client for ${purpose}`);
      promises.push(client.quit() as unknown as Promise<void>);
    }
    
    await Promise.all(promises);
    this.clients.clear();
  }

  static getHealthStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    
    for (const [purpose, client] of this.clients) {
      status[purpose] = client.status;
    }
    
    return status;
  }
}

// Test connection utility
export async function testRedisConnection(): Promise<boolean> {
  try {
    const client = new Redis(getRedisUrl(), { maxRetriesPerRequest: null as any, enableReadyCheck: false as any });
    const result = await client.ping();
    await client.quit();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis connection test failed:', error);
    return false;
  }
}

// Health check for monitoring
export async function getRedisHealthCheck(): Promise<{
  connected: boolean;
  latency?: number;
  memory?: any;
  clients: Record<string, string>;
}> {
  try {
    const client = RedisClientFactory.getClient('cache');
    
    // Test latency
    const start = Date.now();
    await client.ping();
    const latency = Date.now() - start;
    
    // Get memory usage
    const info = await client.info('memory');
    const memoryLines = info.split('\r\n');
    const usedMemory = memoryLines
      .find(line => line.startsWith('used_memory_human:'))
      ?.split(':')[1];
    
    return {
      connected: true,
      latency,
      memory: { used: usedMemory },
      clients: RedisClientFactory.getHealthStatus(),
    };
  } catch (error) {
    return {
      connected: false,
      clients: RedisClientFactory.getHealthStatus(),
    };
  }
}

// Configuration validation
export function validateRedisConfig(): {
  valid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  if (process.env.NODE_ENV === 'production') {
    if (!process.env['REDIS_URL']) {
      issues.push('REDIS_URL is not set for production');
    }
    
    if (!(process.env['REDIS_URL'] || '').includes('rediss://')) {
      recommendations.push('Consider using TLS (rediss://) for production Redis');
    }
    
    if (!process.env['REDIS_CLUSTER']) {
      recommendations.push('Consider using Redis Cluster for high availability');
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    recommendations,
  };
}

// Export connections for BullMQ
export const connection = getBullMQConnection();
export const queueConnection = connection;
export const defaultJobOptions = {
  removeOnComplete: {
    age: 3600, // 1 hour
    count: 100, // Keep last 100 completed jobs
  },
  removeOnFail: {
    age: 86400, // 24 hours
    count: 500, // Keep last 500 failed jobs
  },
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
};
