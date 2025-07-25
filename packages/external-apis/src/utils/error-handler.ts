export interface SyncError {
  service: string;
  operation: string;
  error: Error;
  context?: Record<string, any>;
  timestamp: Date;
}

export class SyncErrorHandler {
  private errors: SyncError[] = [];
  private maxRetries = 3;
  private retryDelay = 1000; // Base delay in ms

  constructor(
    private options: {
      maxRetries?: number;
      retryDelay?: number;
      onError?: (error: SyncError) => void;
    } = {}
  ) {
    if (options.maxRetries) this.maxRetries = options.maxRetries;
    if (options.retryDelay) this.retryDelay = options.retryDelay;
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    context: {
      service: string;
      operation: string;
      context?: Record<string, any>;
    }
  ): Promise<T | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const syncError: SyncError = {
          service: context.service,
          operation: context.operation,
          error: lastError,
          context: { ...context.context, attempt },
          timestamp: new Date(),
        };

        this.errors.push(syncError);
        
        if (this.options.onError) {
          this.options.onError(syncError);
        }

        // Don't retry on certain errors
        if (this.shouldNotRetry(lastError)) {
          break;
        }

        // Exponential backoff
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Log final failure
    console.error(`Failed after ${this.maxRetries} attempts:`, {
      service: context.service,
      operation: context.operation,
      error: lastError?.message,
    });

    return null;
  }

  private shouldNotRetry(error: Error): boolean {
    // Don't retry on certain errors
    const nonRetryableErrors = [
      'Invalid credentials',
      'Unauthorized',
      'Forbidden',
      'Not Found',
    ];

    return nonRetryableErrors.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  getErrors(): SyncError[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  getErrorSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    
    this.errors.forEach(error => {
      const key = `${error.service}:${error.operation}`;
      summary[key] = (summary[key] || 0) + 1;
    });

    return summary;
  }
}

// Rate limit error
export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// API error
export class APIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Sync error
export class SyncServiceError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly operation: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SyncServiceError';
  }
}