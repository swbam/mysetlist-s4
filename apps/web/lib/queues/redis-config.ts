import { Redis as UpstashRedis } from "@upstash/redis";
import type { ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";

// Build config from environment (supports standard REDIS_URL or discrete settings)
const {
  REDIS_URL,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_USERNAME,
  REDIS_PASSWORD,
  REDIS_TLS,
} = process.env as Record<string, string | undefined>;

const parsedPort = REDIS_PORT ? Number.parseInt(REDIS_PORT, 10) : undefined;

// Connection options helper
const baseOptions = {
  maxRetriesPerRequest: null as any,
  enableReadyCheck: false,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  // Prevent eager connection attempts during build; connect on first command
  lazyConnect: true as any,
};

// ioredis-compatible factory
export const createRedisClient = () => {
  if (REDIS_URL) {
    return new Redis(REDIS_URL, baseOptions as any);
  }

  return new Redis({
    host: REDIS_HOST || "127.0.0.1",
    port: parsedPort || 6379,
    username: REDIS_USERNAME || undefined,
    password: REDIS_PASSWORD || undefined,
    tls: REDIS_TLS === "true" ? {} : undefined,
    ...baseOptions,
  } as any);
};

// BullMQ connection configuration (derived from same env)
export const bullMQConnection: ConnectionOptions = REDIS_URL
  ? {
      host: "present-guinea-37462.upstash.io",
      port: 6380,
      password:
        "AZJWAAIncDE5ODdhYmJiZGQ3MGM0MTE2OTRlZTYzMWQyYThjYjc1NXAxMzc0NjI",
      tls: {},
      connectTimeout: 30000,
      lazyConnect: true,
      keepAlive: 10000,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    }
  : ({
      host: REDIS_HOST || "127.0.0.1",
      port: parsedPort || 6379,
      username: REDIS_USERNAME,
      password: REDIS_PASSWORD,
      tls: REDIS_TLS === "true" ? {} : undefined,
      ...(baseOptions as any),
    } as any);

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

  async increment(key: string, by = 1): Promise<number> {
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

// Simple Queue implementation using Upstash REST API
export class SimpleQueue {
  private redis: UpstashRedis;
  private queueName: string;

  constructor(queueName: string) {
    this.queueName = queueName;
    this.redis = new UpstashRedis({
      url: process.env["UPSTASH_REDIS_REST_URL"]!,
      token: process.env["UPSTASH_REDIS_REST_TOKEN"]!,
    });
  }

  async add(
    jobName: string,
    data: any,
    options: { delay?: number; attempts?: number } = {},
  ): Promise<string> {
    const jobId = `${this.queueName}:${Date.now()}:${Math.random().toString(36).substring(7)}`;
    const job = {
      id: jobId,
      name: jobName,
      data: JSON.stringify(data),
      attempts: (options.attempts || 3).toString(),
      attemptsLeft: (options.attempts || 3).toString(),
      createdAt: new Date().toISOString(),
      processAt: options.delay
        ? new Date(Date.now() + options.delay).toISOString()
        : new Date().toISOString(),
      status: "waiting",
    };

    // Add to queue
    await this.redis.lpush(`queue:${this.queueName}`, JSON.stringify(job));

    // Add to jobs hash for tracking (string values only)
    await this.redis.hset(`job:${jobId}`, job);

    return jobId;
  }

  async process(processor: (job: any) => Promise<void>): Promise<void> {
    console.log(`Starting queue processor for ${this.queueName}...`);

    const processNext = async () => {
      try {
        // Get next job (non-blocking)
        const jobStr = await this.redis.rpop(`queue:${this.queueName}`);

        if (!jobStr) {
          // No job available, try again
          setTimeout(processNext, 1000);
          return;
        }

        // Debug: log what we received
        console.log("Queue processor received:", typeof jobStr, jobStr);

        let job;
        if (typeof jobStr === "string") {
          job = JSON.parse(jobStr);
        } else {
          // If it's already an object, use it directly
          job = jobStr;
        }

        // Parse the job data back to object (if it's a string)
        if (typeof job.data === "string") {
          job.data = JSON.parse(job.data);
        }
        if (typeof job.attempts === "string") {
          job.attempts = Number.parseInt(job.attempts);
        }
        if (typeof job.attemptsLeft === "string") {
          job.attemptsLeft = Number.parseInt(job.attemptsLeft);
        }

        // Check if job should be processed now
        if (new Date(job.processAt) > new Date()) {
          // Job is delayed, put it back and try again
          await this.redis.lpush(
            `queue:${this.queueName}`,
            JSON.stringify({
              ...job,
              data: JSON.stringify(job.data),
              attempts: job.attempts.toString(),
              attemptsLeft: job.attemptsLeft.toString(),
            }),
          );
          setTimeout(processNext, 1000);
          return;
        }

        try {
          // Update job status
          await this.redis.hset(`job:${job.id}`, {
            status: "processing",
            startedAt: new Date().toISOString(),
          });

          // Add BullMQ-compatible methods to job
          job.log = async (message: string) => {
            console.log(`[${job.id}] ${message}`);
          };

          job.updateProgress = async (progress: number) => {
            console.log(`[${job.id}] Progress: ${progress}%`);
            await this.redis.hset(`job:${job.id}`, {
              progress: progress.toString(),
              updatedAt: new Date().toISOString(),
            });
          };

          // Process the job
          await processor(job);

          // Mark as completed
          await this.redis.hset(`job:${job.id}`, {
            status: "completed",
            completedAt: new Date().toISOString(),
          });

          console.log(`✅ Completed job ${job.id}`);
        } catch (error) {
          console.error(`❌ Job ${job.id} failed:`, error);

          job.attemptsLeft--;

          if (job.attemptsLeft > 0) {
            // Retry the job
            await this.redis.lpush(
              `queue:${this.queueName}`,
              JSON.stringify({
                ...job,
                data: JSON.stringify(job.data),
                attempts: job.attempts.toString(),
                attemptsLeft: job.attemptsLeft.toString(),
                status: "waiting",
                processAt: new Date(Date.now() + 5000).toISOString(), // 5 second delay
              }),
            );

            await this.redis.hset(`job:${job.id}`, {
              status: "waiting",
              lastError: (error as Error).message,
              attemptsLeft: job.attemptsLeft.toString(),
            });
          } else {
            // Mark as failed
            await this.redis.hset(`job:${job.id}`, {
              status: "failed",
              failedAt: new Date().toISOString(),
              lastError: (error as Error).message,
            });
          }
        }
      } catch (error) {
        console.error("Queue processing error:", error);
      }

      // Continue processing
      setTimeout(processNext, 100);
    };

    // Start processing
    processNext();
  }

  async getJob(jobId: string): Promise<any> {
    return await this.redis.hgetall(`job:${jobId}`);
  }

  async count(): Promise<number> {
    return await this.redis.llen(`queue:${this.queueName}`);
  }

  async getWaiting(): Promise<number> {
    return await this.count();
  }

  async obliterate(): Promise<void> {
    const keys = await this.redis.keys(`queue:${this.queueName}*`);
    const jobKeys = await this.redis.keys(`job:${this.queueName}*`);

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    if (jobKeys.length > 0) {
      await this.redis.del(...jobKeys);
    }
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
