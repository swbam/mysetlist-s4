export class SyncServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public operation: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = "SyncServiceError";
  }
}

export class SyncErrorHandler {
  private maxRetries: number;
  private retryDelay: number;
  private onError: (error: Error) => void;

  constructor(options: {
    maxRetries: number;
    retryDelay: number;
    onError: (error: Error) => void;
  }) {
    this.maxRetries = options.maxRetries;
    this.retryDelay = options.retryDelay;
    this.onError = options.onError;
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    context: { service: string; operation: string; context: any },
  ): Promise<T | null> {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        const syncError = new SyncServiceError(
          `Operation failed: ${context.operation}`,
          context.service,
          context.operation,
          error instanceof Error ? error : undefined,
        );
        this.onError(syncError);
        if (i === this.maxRetries - 1) {
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
      }
    }
    return null;
  }
}
