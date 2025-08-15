/**
 * Concurrency control utilities for bounded parallelism
 * Implements GROK.md specifications for high-throughput import operations
 */

export interface PLimit {
  <T>(fn: () => Promise<T>): Promise<T>;
  activeCount: number;
  pendingCount: number;
  clearQueue(): void;
}

/**
 * Creates a function that limits the number of concurrent executions
 * Based on the popular p-limit library pattern but implemented for our specific needs
 */
export function pLimit(concurrency: number): PLimit {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new TypeError('Expected `concurrency` to be a positive integer');
  }

  const queue: Array<() => void> = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    
    if (queue.length > 0) {
      const nextTask = queue.shift()!;
      nextTask();
    }
  };

  const run = <T>(fn: () => Promise<T>, resolve: (value: T) => void, reject: (reason?: any) => void) => {
    activeCount++;
    
    const result = (async () => {
      try {
        const value = await fn();
        resolve(value);
      } catch (error) {
        reject(error);
      } finally {
        next();
      }
    })();
  };

  const enqueue = <T>(fn: () => Promise<T>, resolve: (value: T) => void, reject: (reason?: any) => void) => {
    queue.push(() => run(fn, resolve, reject));
  };

  const generator = <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      if (activeCount < concurrency) {
        run(fn, resolve, reject);
      } else {
        enqueue(fn, resolve, reject);
      }
    });

  Object.defineProperties(generator, {
    activeCount: {
      get: () => activeCount,
    },
    pendingCount: {
      get: () => queue.length,
    },
    clearQueue: {
      value: () => {
        queue.length = 0;
      },
    },
  });

  return generator as PLimit;
}

/**
 * Batch processor with concurrency control and progress tracking
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: {
    concurrency?: number;
    onProgress?: (completed: number, total: number, result?: R) => void;
    onError?: (error: Error, item: T, index: number) => void;
    continueOnError?: boolean;
  } = {}
): Promise<R[]> {
  const {
    concurrency = 5,
    onProgress,
    onError,
    continueOnError = false,
  } = options;

  if (items.length === 0) {
    return [];
  }

  const limit = pLimit(concurrency);
  const results: R[] = new Array(items.length);
  const errors: Error[] = [];
  let completed = 0;

  const processItem = async (item: T, index: number): Promise<void> => {
    try {
      const result = await processor(item, index);
      results[index] = result;
      completed++;
      onProgress?.(completed, items.length, result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push(err);
      completed++;
      
      onError?.(err, item, index);
      onProgress?.(completed, items.length);
      
      if (!continueOnError) {
        throw err;
      }
    }
  };

  const promises = items.map((item, index) =>
    limit(() => processItem(item, index))
  );

  await Promise.all(promises);

  if (errors.length > 0 && !continueOnError) {
    throw new Error(`Batch processing failed with ${errors.length} errors. First error: ${errors[0]?.message || 'Unknown error'}`);
  }

  return results;
}

/**
 * Queue-based task processor for background operations
 */
export class TaskQueue<T = any> {
  private queue: Array<() => Promise<T>> = [];
  private processing = false;
  private concurrency: number;
  private activeCount = 0;
  private onProgress?: (completed: number, total: number) => void;

  constructor(options: {
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}) {
    this.concurrency = options.concurrency || 3;
    this.onProgress = options.onProgress;
  }

  /**
   * Add a task to the queue
   */
  add(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          throw error;
        }
      });

      if (!this.processing) {
        this.process();
      }
    });
  }

  /**
   * Add multiple tasks to the queue
   */
  addBatch(tasks: Array<() => Promise<T>>): Promise<T[]> {
    const promises = tasks.map(task => this.add(task));
    return Promise.all(promises);
  }

  /**
   * Process the queue with concurrency control
   */
  private async process(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;
    const totalTasks = this.queue.length;
    let completed = 0;

    const processNext = async (): Promise<void> => {
      while (this.queue.length > 0 && this.activeCount < this.concurrency) {
        const task = this.queue.shift();
        if (!task) continue;

        this.activeCount++;
        
        try {
          await task();
        } catch (error) {
          // Error already handled in add() method
        } finally {
          this.activeCount--;
          completed++;
          this.onProgress?.(completed, totalTasks);
        }
      }

      if (this.queue.length > 0) {
        // Wait a bit and continue processing
        await new Promise(resolve => setTimeout(resolve, 10));
        await processNext();
      }
    };

    await processNext();
    this.processing = false;
  }

  /**
   * Get queue status
   */
  getStatus(): {
    pending: number;
    active: number;
    total: number;
  } {
    return {
      pending: this.queue.length,
      active: this.activeCount,
      total: this.queue.length + this.activeCount,
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue.length = 0;
  }
}

/**
 * Utility for parallel async operations with result aggregation
 */
export async function parallelMap<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  concurrency = 5
): Promise<R[]> {
  const limit = pLimit(concurrency);
  const promises = items.map((item, index) =>
    limit(() => mapper(item, index))
  );
  return Promise.all(promises);
}

/**
 * Utility for parallel async operations that filters results
 */
export async function parallelFilter<T>(
  items: T[],
  predicate: (item: T, index: number) => Promise<boolean>,
  concurrency = 5
): Promise<T[]> {
  const limit = pLimit(concurrency);
  const results = await Promise.all(
    items.map(async (item, index) => {
      const shouldInclude = await limit(() => predicate(item, index));
      return { item, shouldInclude };
    })
  );
  
  return results
    .filter(result => result.shouldInclude)
    .map(result => result.item);
}

/**
 * Chunked processing for large datasets
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (chunk: T[]) => Promise<R[]>,
  options: {
    chunkSize?: number;
    concurrency?: number;
    onProgress?: (processedItems: number, totalItems: number) => void;
  } = {}
): Promise<R[]> {
  const {
    chunkSize = 50,
    concurrency = 3,
    onProgress,
  } = options;

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  const limit = pLimit(concurrency);
  const results: R[] = [];
  let processedItems = 0;

  const processChunk = async (chunk: T[]): Promise<R[]> => {
    const chunkResults = await processor(chunk);
    processedItems += chunk.length;
    onProgress?.(processedItems, items.length);
    return chunkResults;
  };

  const allResults = await Promise.all(
    chunks.map(chunk => limit(() => processChunk(chunk)))
  );

  return allResults.flat();
}