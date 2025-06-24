export class CircuitBreaker {
  private failures = 0;
  private nextAttempt = Date.now();
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private resetTimeout: number = 300000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitBreakerError('Circuit breaker is OPEN', this.state);
      }
      this.state = 'HALF_OPEN';
    }

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
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }

  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }

  getNextAttemptTime(): number {
    return this.nextAttempt;
  }

  // Manually reset the circuit breaker
  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }

  // Get circuit breaker statistics
  getStats(): {
    state: string;
    failures: number;
    nextAttempt: number;
    threshold: number;
  } {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: this.nextAttempt,
      threshold: this.threshold,
    };
  }
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// Circuit breaker instances for different services
export const spotifyCircuitBreaker = new CircuitBreaker(5, 60000, 300000);
export const ticketmasterCircuitBreaker = new CircuitBreaker(3, 30000, 180000);
export const setlistfmCircuitBreaker = new CircuitBreaker(3, 30000, 180000); 