import { Redis } from "@upstash/redis";
export interface APIClientConfig {
    baseURL: string;
    apiKey?: string | undefined;
    rateLimit?: {
        requests: number;
        window: number;
    } | undefined;
    cache?: {
        defaultTTL: number;
    } | undefined;
}
export declare abstract class BaseAPIClient {
    protected baseURL: string;
    protected apiKey: string | undefined;
    protected rateLimit: {
        requests: number;
        window: number;
    } | undefined;
    protected cache: Redis | any;
    constructor(config: APIClientConfig);
    protected makeRequest<T>(endpoint: string, options?: RequestInit, cacheKey?: string, cacheTTL?: number): Promise<T>;
    protected abstract getAuthHeaders(): Record<string, string>;
    private checkRateLimit;
}
export declare class APIError extends Error {
    statusCode: number;
    endpoint: string;
    constructor(message: string, statusCode: number, endpoint: string);
}
export declare class RateLimitError extends Error {
    constructor(message: string);
}
//# sourceMappingURL=base.d.ts.map