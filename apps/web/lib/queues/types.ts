// Job types for SimpleQueue compatibility
export interface SimpleJob<T = any> {
  id: string;
  name: string;
  data: T;
  attempts: number;
  attemptsLeft: number;
  createdAt: string;
  processAt: string;
  status: string;

  // BullMQ-compatible methods (added by SimpleQueue processor)
  log: (message: string) => Promise<void>;
  updateProgress: (progress: number) => Promise<void>;
}

// Re-export common queue types
export { QueueName, Priority, type JobOptions } from "./queue-manager";
