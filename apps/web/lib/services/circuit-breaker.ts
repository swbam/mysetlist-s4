// Circuit breaker pattern for external API reliability
export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  halfOpenLimit?: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private state: CircuitState = CircuitState.CLOSED;
  private halfOpenRequests = 0;
  private successCount = 0;
  private totalRequests = 0;
  private lastResetTime = Date.now();

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 600000, // 10 minutes
      halfOpenLimit: 3
    }
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if we should reset counters
    this.checkMonitoringPeriod();
    
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenRequests = 0;
        console.log(`Circuit breaker ${this.name} entering HALF_OPEN state`);
      } else {
        const waitTime = this.getWaitTime();
        throw new Error(
          `Circuit breaker ${this.name} is OPEN. Try again in ${Math.ceil(waitTime / 1000)}s`
        );
      }
    }

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenRequests >= this.options.halfOpenLimit!) {
        throw new Error(
          `Circuit breaker ${this.name} is HALF_OPEN. Limit reached, waiting for results`
        );
      }
      this.halfOpenRequests++;
    }

    this.totalRequests++;

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successCount++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      // In half-open state, one success closes the circuit
      this.failures = 0;
      this.state = CircuitState.CLOSED;
      console.log(`Circuit breaker ${this.name} is now CLOSED after successful request`);
    } else if (this.state === CircuitState.CLOSED) {
      // Decay failures on success
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      // In half-open state, one failure reopens the circuit
      this.state = CircuitState.OPEN;
      console.error(`Circuit breaker ${this.name} is now OPEN after failure in HALF_OPEN state`);
    } else if (this.failures >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.error(`Circuit breaker ${this.name} is now OPEN after ${this.failures} failures`);
    }
  }

  private shouldAttemptReset(): boolean {
    return (
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime >= this.options.resetTimeout
    );
  }

  private getWaitTime(): number {
    if (!this.lastFailureTime) return 0;
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.options.resetTimeout - elapsed);
  }

  private checkMonitoringPeriod(): void {
    if (Date.now() - this.lastResetTime >= this.options.monitoringPeriod) {
      // Reset counters but maintain state
      this.successCount = 0;
      this.totalRequests = 0;
      this.lastResetTime = Date.now();
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      successRate: this.totalRequests > 0 
        ? (this.successCount / this.totalRequests) * 100 
        : 100,
      totalRequests: this.totalRequests,
      waitTime: this.state === CircuitState.OPEN ? this.getWaitTime() : 0
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.lastFailureTime = null;
    this.halfOpenRequests = 0;
    console.log(`Circuit breaker ${this.name} has been manually reset`);
  }
}

// Singleton circuit breakers for external APIs
export const spotifyCircuitBreaker = new CircuitBreaker('Spotify API', {
  failureThreshold: 3,
  resetTimeout: 30000, // 30 seconds
  monitoringPeriod: 300000, // 5 minutes
  halfOpenLimit: 2
});

export const ticketmasterCircuitBreaker = new CircuitBreaker('Ticketmaster API', {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  monitoringPeriod: 600000, // 10 minutes
  halfOpenLimit: 3
});

export const setlistFmCircuitBreaker = new CircuitBreaker('SetlistFM API', {
  failureThreshold: 4,
  resetTimeout: 45000, // 45 seconds
  monitoringPeriod: 300000, // 5 minutes
  halfOpenLimit: 2
});

// Health check endpoint helper
export function getCircuitBreakerHealth() {
  return {
    spotify: spotifyCircuitBreaker.getState(),
    ticketmaster: ticketmasterCircuitBreaker.getState(),
    setlistfm: setlistFmCircuitBreaker.getState()
  };
}
