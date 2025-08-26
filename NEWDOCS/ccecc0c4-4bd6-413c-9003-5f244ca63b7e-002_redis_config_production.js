"use strict";
// MySetlist-S4 Production Redis Configuration
// File: apps/web/lib/queues/redis-config.ts
// REPLACE existing file with this production-ready implementation
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisClientFactory = exports.getBullMQConnection = exports.getRedisConnection = exports.cacheConnection = exports.bullMQConnection = void 0;
exports.testRedisConnection = testRedisConnection;
exports.getRedisHealthCheck = getRedisHealthCheck;
exports.validateRedisConfig = validateRedisConfig;
const ioredis_1 = require("ioredis");
// Production-ready Redis configuration
const getRedisUrl = () => {
    // Priority order: REDIS_URL > individual components > localhost fallback
    if (process.env.REDIS_URL) {
        return process.env.REDIS_URL;
    }
    const host = process.env.REDIS_HOST || "localhost";
    const port = process.env.REDIS_PORT || "6379";
    const password = process.env.REDIS_PASSWORD;
    const username = process.env.REDIS_USERNAME || "default";
    if (password) {
        return `redis://${username}:${password}@${host}:${port}/0`;
    }
    return `redis://${host}:${port}/0`;
};
// Base Redis configuration for production
const baseRedisConfig = {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    connectTimeout: 10000,
    commandTimeout: 5000,
    lazyConnect: true,
    family: 4,
    keepAlive: true,
    // Connection pool settings
    enableReadyCheck: false,
    // Error handling
    retryOnFailover: true,
    reconnectOnError: (err) => {
        console.log("Redis reconnect on error:", err.message);
        return err.message.includes("READONLY");
    },
};
// BullMQ specific configuration
exports.bullMQConnection = {
    ...baseRedisConfig,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false, // Required for BullMQ
    db: parseInt(process.env.REDIS_QUEUE_DB || "1"), // Separate DB for queues
};
// General Redis connection for caching
exports.cacheConnection = {
    ...baseRedisConfig,
    db: parseInt(process.env.REDIS_CACHE_DB || "0"), // Default DB for caching
};
// Parse Redis URL and create connection options
const getRedisConnection = () => {
    const redisUrl = getRedisUrl();
    try {
        const url = new URL(redisUrl);
        return {
            ...baseRedisConfig,
            host: url.hostname,
            port: parseInt(url.port || "6379"),
            password: url.password || undefined,
            username: url.username || "default",
            db: parseInt(url.pathname.slice(1) || "0"),
        };
    }
    catch (error) {
        console.warn("⚠️ Failed to parse Redis URL, using localhost fallback:", error);
        return {
            ...baseRedisConfig,
            host: "localhost",
            port: 6379,
            maxRetriesPerRequest: 1, // Reduced for development
        };
    }
};
exports.getRedisConnection = getRedisConnection;
// Get BullMQ specific connection
const getBullMQConnection = () => {
    const baseConnection = (0, exports.getRedisConnection)();
    return {
        ...baseConnection,
        ...exports.bullMQConnection,
    };
};
exports.getBullMQConnection = getBullMQConnection;
// Redis client factory for different use cases
class RedisClientFactory {
    static clients = new Map();
    static getClient(purpose = 'cache') {
        if (this.clients.has(purpose)) {
            return this.clients.get(purpose);
        }
        const config = purpose === 'queue' ? (0, exports.getBullMQConnection)() : (0, exports.getRedisConnection)();
        const client = new ioredis_1.Redis({
            ...config,
            // Add purpose-specific overrides
            ...(purpose === 'pubsub' && { lazyConnect: false }), // PubSub needs immediate connection
        });
        // Error handling
        client.on('error', (err) => {
            console.error(`Redis ${purpose} client error:`, err);
        });
        client.on('connect', () => {
            console.log(`✅ Redis ${purpose} client connected`);
        });
        client.on('reconnecting', () => {
            console.log(`🔄 Redis ${purpose} client reconnecting...`);
        });
        this.clients.set(purpose, client);
        return client;
    }
    static async closeAll() {
        const closePromises = Array.from(this.clients.values()).map(client => client.disconnect());
        await Promise.all(closePromises);
        this.clients.clear();
        console.log('✅ All Redis clients closed');
    }
    static getHealthStatus() {
        const status = {};
        for (const [purpose, client] of this.clients.entries()) {
            status[purpose] = client.status;
        }
        return status;
    }
}
exports.RedisClientFactory = RedisClientFactory;
// Test Redis connection
async function testRedisConnection() {
    try {
        const client = RedisClientFactory.getClient('cache');
        await client.ping();
        console.log('✅ Redis connection test successful');
        return true;
    }
    catch (error) {
        console.error('❌ Redis connection test failed:', error);
        return false;
    }
}
// Health check function for monitoring
async function getRedisHealthCheck() {
    try {
        const client = RedisClientFactory.getClient('cache');
        const start = Date.now();
        await client.ping();
        const latency = Date.now() - start;
        // Get memory info if available
        let memory;
        try {
            const info = await client.memory('usage', 'test-key');
            memory = { usage: info };
        }
        catch {
            // Memory command not available in all Redis versions
            memory = null;
        }
        return {
            connected: true,
            latency,
            memory,
            clients: RedisClientFactory.getHealthStatus(),
        };
    }
    catch (error) {
        return {
            connected: false,
            clients: RedisClientFactory.getHealthStatus(),
        };
    }
}
// Configuration validation
function validateRedisConfig() {
    const issues = [];
    const recommendations = [];
    // Check for Redis URL
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
        issues.push("No Redis configuration found (REDIS_URL or REDIS_HOST)");
        recommendations.push("Set REDIS_URL environment variable for production");
    }
    // Check for production settings
    if (process.env.NODE_ENV === 'production') {
        if (!process.env.REDIS_PASSWORD) {
            issues.push("No Redis password set for production");
            recommendations.push("Set REDIS_PASSWORD for production security");
        }
        if (!process.env.REDIS_URL?.includes('rediss://')) {
            recommendations.push("Consider using SSL/TLS (rediss://) for production Redis connections");
        }
    }
    // Check queue database separation
    if (process.env.REDIS_QUEUE_DB === process.env.REDIS_CACHE_DB) {
        recommendations.push("Consider using separate Redis databases for queues and cache");
    }
    return {
        valid: issues.length === 0,
        issues,
        recommendations,
    };
}
// Auto-validate on module load in development
if (process.env.NODE_ENV === 'development') {
    const validation = validateRedisConfig();
    if (!validation.valid) {
        console.warn('⚠️ Redis configuration issues:', validation.issues);
    }
    if (validation.recommendations.length > 0) {
        console.info('💡 Redis configuration recommendations:', validation.recommendations);
    }
}
