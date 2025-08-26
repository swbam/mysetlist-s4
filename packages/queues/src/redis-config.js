"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCache = exports.getRedisSubClient = exports.getRedisPubClient = exports.bullMQConnection = exports.createRedisClient = void 0;
exports.closeRedisConnections = closeRedisConnections;
const ioredis_1 = require("ioredis");
// Build config from environment (supports REDIS_URL, Upstash, or discrete settings)
const { REDIS_URL, REDIS_HOST, REDIS_PORT, REDIS_USERNAME, REDIS_PASSWORD, REDIS_TLS, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, } = process.env;
const parsedPort = REDIS_PORT ? parseInt(REDIS_PORT, 10) : undefined;
// Connection options helper
const baseOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    // Prevent eager connection attempts during build; connect on first command
    lazyConnect: true,
};
// ioredis-compatible factory with Upstash support
const createRedisClient = () => {
    // Direct Redis URL (preferred for BullMQ)
    if (REDIS_URL) {
        return new ioredis_1.Redis(REDIS_URL, baseOptions);
    }
    // Convert Upstash REST URL to Redis protocol if available
    if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
        try {
            const url = new URL(UPSTASH_REDIS_REST_URL);
            const redisUrl = `redis://default:${UPSTASH_REDIS_REST_TOKEN}@${url.hostname}:6379`;
            return new ioredis_1.Redis(redisUrl, baseOptions);
        }
        catch (error) {
            console.error('Failed to parse Upstash URL for Redis client:', error);
        }
    }
    // Fallback to discrete settings
    return new ioredis_1.Redis({
        host: REDIS_HOST || "127.0.0.1",
        port: parsedPort || 6379,
        username: REDIS_USERNAME || undefined,
        password: REDIS_PASSWORD || undefined,
        tls: REDIS_TLS === "true" ? {} : undefined,
        ...baseOptions,
    });
};
exports.createRedisClient = createRedisClient;
// BullMQ connection configuration with Upstash support
exports.bullMQConnection = (() => {
    // Use direct Redis URL if available (best for BullMQ)
    if (REDIS_URL) {
        return { url: REDIS_URL, ...baseOptions };
    }
    // Convert Upstash to Redis URL if available
    if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
        try {
            const url = new URL(UPSTASH_REDIS_REST_URL);
            const redisUrl = `redis://default:${UPSTASH_REDIS_REST_TOKEN}@${url.hostname}:6379`;
            return { url: redisUrl, ...baseOptions };
        }
        catch (error) {
            console.error('Failed to parse Upstash URL for BullMQ:', error);
        }
    }
    // Fallback to discrete settings
    return {
        host: REDIS_HOST || "127.0.0.1",
        port: parsedPort || 6379,
        username: REDIS_USERNAME,
        password: REDIS_PASSWORD,
        tls: REDIS_TLS === "true" ? {} : undefined,
        ...baseOptions,
    };
})();
// Singleton Redis client for pub/sub
let pubClient = null;
let subClient = null;
const getRedisPubClient = () => {
    if (!pubClient) {
        pubClient = (0, exports.createRedisClient)();
    }
    return pubClient;
};
exports.getRedisPubClient = getRedisPubClient;
const getRedisSubClient = () => {
    if (!subClient) {
        subClient = (0, exports.createRedisClient)();
    }
    return subClient;
};
exports.getRedisSubClient = getRedisSubClient;
// Cache operations with TTL
class RedisCache {
    client;
    constructor() {
        this.client = (0, exports.createRedisClient)();
    }
    async get(key) {
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            console.error(`Redis cache get error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            const serialized = JSON.stringify(value);
            if (ttlSeconds) {
                await this.client.setex(key, ttlSeconds, serialized);
            }
            else {
                await this.client.set(key, serialized);
            }
        }
        catch (error) {
            console.error(`Redis cache set error for key ${key}:`, error);
        }
    }
    async del(key) {
        try {
            await this.client.del(key);
        }
        catch (error) {
            console.error(`Redis cache delete error for key ${key}:`, error);
        }
    }
    async exists(key) {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error(`Redis cache exists error for key ${key}:`, error);
            return false;
        }
    }
    async increment(key, by = 1) {
        try {
            return await this.client.incrby(key, by);
        }
        catch (error) {
            console.error(`Redis cache increment error for key ${key}:`, error);
            return 0;
        }
    }
    async expire(key, ttlSeconds) {
        try {
            await this.client.expire(key, ttlSeconds);
        }
        catch (error) {
            console.error(`Redis cache expire error for key ${key}:`, error);
        }
    }
    async close() {
        await this.client.quit();
    }
}
exports.RedisCache = RedisCache;
// Cleanup function
async function closeRedisConnections() {
    const promises = [];
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
