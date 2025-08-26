import { ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";
export declare const bullMQConnection: ConnectionOptions;
export declare const cacheConnection: ConnectionOptions;
export declare const getRedisConnection: () => ConnectionOptions;
export declare const getBullMQConnection: () => ConnectionOptions;
export declare class RedisClientFactory {
    private static clients;
    static getClient(purpose?: 'queue' | 'cache' | 'pubsub'): Redis;
    static closeAll(): Promise<void>;
    static getHealthStatus(): Record<string, string>;
}
export declare function testRedisConnection(): Promise<boolean>;
export declare function getRedisHealthCheck(): Promise<{
    connected: boolean;
    latency?: number;
    memory?: any;
    clients: Record<string, string>;
}>;
export { getRedisConnection as bullMQConnection };
export declare function validateRedisConfig(): {
    valid: boolean;
    issues: string[];
    recommendations: string[];
};
//# sourceMappingURL=ccecc0c4-4bd6-413c-9003-5f244ca63b7e-002_redis_config_production.d.ts.map