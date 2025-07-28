import { CacheClient } from "~/lib/cache/redis";

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  halfOpenRequests: number;
}

export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export class CircuitBreaker {
  private cache = CacheClient.getInstance();
  private config: CircuitBreakerConfig;
  private name: string;

  constructor(name: string, config?: Partial<CircuitBreakerConfig>) {
    this.name = name;
    this.config = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 60000, // 1 minute
      halfOpenRequests: 3,
      ...config,
    };
  }

  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    const state = await this.getState();

    if (state === CircuitState.OPEN) {
      const shouldTryHalfOpen = await this.shouldTransitionToHalfOpen();
      if (!shouldTryHalfOpen) {
        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker is OPEN for ${this.name}`);
      }
      await this.setState(CircuitState.HALF_OPEN);
    }

    try {
      const result = await fn();
      await this.onSuccess();
      return result;
    } catch (error) {
      await this.onFailure();

      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  private async getState(): Promise<CircuitState> {
    const stateKey = `circuit:${this.name}:state`;
    const state = await this.cache.get<string>(stateKey);
    return (state as CircuitState) || CircuitState.CLOSED;
  }

  private async setState(state: CircuitState): Promise<void> {
    const stateKey = `circuit:${this.name}:state`;
    await this.cache.set(stateKey, state, {
      ex: this.config.resetTimeout / 1000,
    });

    if (state === CircuitState.OPEN) {
      const openTimeKey = `circuit:${this.name}:openTime`;
      await this.cache.set(openTimeKey, Date.now(), {
        ex: this.config.resetTimeout / 1000,
      });
    }
  }

  private async getFailureCount(): Promise<number> {
    const countKey = `circuit:${this.name}:failures`;
    const count = await this.cache.get<number>(countKey);
    return count || 0;
  }

  private async incrementFailureCount(): Promise<number> {
    const countKey = `circuit:${this.name}:failures`;
    const newCount = await this.cache.incr(countKey);

    // Set expiry on first increment
    if (newCount === 1) {
      await this.cache.expire(countKey, this.config.monitoringPeriod / 1000);
    }

    return newCount;
  }

  private async resetFailureCount(): Promise<void> {
    const countKey = `circuit:${this.name}:failures`;
    await this.cache.del(countKey);
  }

  private async getHalfOpenCount(): Promise<number> {
    const countKey = `circuit:${this.name}:halfOpen`;
    const count = await this.cache.get<number>(countKey);
    return count || 0;
  }

  private async incrementHalfOpenCount(): Promise<number> {
    const countKey = `circuit:${this.name}:halfOpen`;
    return await this.cache.incr(countKey);
  }

  private async resetHalfOpenCount(): Promise<void> {
    const countKey = `circuit:${this.name}:halfOpen`;
    await this.cache.del(countKey);
  }

  private async shouldTransitionToHalfOpen(): Promise<boolean> {
    const openTimeKey = `circuit:${this.name}:openTime`;
    const openTime = await this.cache.get<number>(openTimeKey);

    if (!openTime) {
      return true;
    }

    const elapsedTime = Date.now() - openTime;
    return elapsedTime >= this.config.resetTimeout;
  }

  private async onSuccess(): Promise<void> {
    const state = await this.getState();

    if (state === CircuitState.HALF_OPEN) {
      const halfOpenCount = await this.incrementHalfOpenCount();

      if (halfOpenCount >= this.config.halfOpenRequests) {
        // Enough successful requests, close the circuit
        await this.setState(CircuitState.CLOSED);
        await this.resetFailureCount();
        await this.resetHalfOpenCount();
      }
    } else if (state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      await this.resetFailureCount();
    }
  }

  private async onFailure(): Promise<void> {
    const state = await this.getState();

    if (state === CircuitState.HALF_OPEN) {
      // Failure in half-open state, immediately open the circuit
      await this.setState(CircuitState.OPEN);
      await this.resetHalfOpenCount();
    } else if (state === CircuitState.CLOSED) {
      const failureCount = await this.incrementFailureCount();

      if (failureCount >= this.config.failureThreshold) {
        // Threshold reached, open the circuit
        await this.setState(CircuitState.OPEN);
      }
    }
  }

  // Monitoring methods
  async getMetrics() {
    const state = await this.getState();
    const failureCount = await this.getFailureCount();
    const halfOpenCount = await this.getHalfOpenCount();

    const openTimeKey = `circuit:${this.name}:openTime`;
    const openTime = await this.cache.get<number>(openTimeKey);

    return {
      name: this.name,
      state,
      failureCount,
      halfOpenCount,
      config: this.config,
      openSince: openTime ? new Date(openTime).toISOString() : null,
    };
  }

  async reset(): Promise<void> {
    await this.setState(CircuitState.CLOSED);
    await this.resetFailureCount();
    await this.resetHalfOpenCount();
  }
}

// Factory for creating circuit breakers for different services
export class CircuitBreakerFactory {
  private static breakers = new Map<string, CircuitBreaker>();

  static getBreaker(
    name: string,
    config?: Partial<CircuitBreakerConfig>,
  ): CircuitBreaker {
    if (!CircuitBreakerFactory.breakers.has(name)) {
      CircuitBreakerFactory.breakers.set(
        name,
        new CircuitBreaker(name, config),
      );
    }
    return CircuitBreakerFactory.breakers.get(name)!;
  }

  static async getAllMetrics() {
    const metrics: any[] = [];
    for (const [_name, breaker] of CircuitBreakerFactory.breakers) {
      metrics.push(await breaker.getMetrics());
    }
    return metrics;
  }
}

// Decorator for applying circuit breaker to functions
export function withCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>,
) {
  return (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;
    const breaker = CircuitBreakerFactory.getBreaker(name, config);

    descriptor.value = async function (...args: any[]) {
      return breaker.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

// Common circuit breaker configurations
export const circuitConfigs = {
  spotify: {
    failureThreshold: 5,
    resetTimeout: 60000,
    monitoringPeriod: 60000,
    halfOpenRequests: 3,
  },
  ticketmaster: {
    failureThreshold: 3,
    resetTimeout: 120000,
    monitoringPeriod: 300000,
    halfOpenRequests: 2,
  },
  setlistfm: {
    failureThreshold: 5,
    resetTimeout: 90000,
    monitoringPeriod: 180000,
    halfOpenRequests: 3,
  },
  email: {
    failureThreshold: 10,
    resetTimeout: 300000,
    monitoringPeriod: 600000,
    halfOpenRequests: 5,
  },
};
