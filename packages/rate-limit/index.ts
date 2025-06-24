import { Ratelimit, type RatelimitConfig } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { keys } from './keys';

// Only create Redis instance if environment variables are available
const createRedisInstance = () => {
  const config = keys();
  if (!config.UPSTASH_REDIS_REST_URL || !config.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  
  return new Redis({
    url: config.UPSTASH_REDIS_REST_URL,
    token: config.UPSTASH_REDIS_REST_TOKEN,
  });
};

export const redis = createRedisInstance();

export const createRateLimiter = (props: Omit<RatelimitConfig, 'redis'>) => {
  if (!redis) {
    // Return a no-op rate limiter if Redis is not configured
    return {
      limit: async () => ({ success: true, limit: Infinity, remaining: Infinity, reset: new Date() })
    };
  }
  
  return new Ratelimit({
    redis,
    limiter: props.limiter ?? Ratelimit.slidingWindow(10, '10 s'),
    prefix: props.prefix ?? 'next-forge',
  });
};

export const { slidingWindow } = Ratelimit;
