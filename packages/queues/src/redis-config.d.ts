import { Redis } from "ioredis";
import { ConnectionOptions } from "bullmq";
export declare const createRedisClient: () => Redis;
export declare const bullMQConnection: ConnectionOptions;
export declare const getRedisPubClient: () => Redis;
export declare const getRedisSubClient: () => Redis;
export declare class RedisCache {
    private client;
    constructor();
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    increment(key: string, by?: number): Promise<number>;
    expire(key: string, ttlSeconds: number): Promise<void>;
    close(): Promise<void>;
}
export declare function closeRedisConnections(): Promise<void>;
//# sourceMappingURL=redis-config.d.ts.map