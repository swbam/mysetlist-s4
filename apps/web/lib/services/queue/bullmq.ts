import { Queue, Worker, QueueEvents, JobsOptions, QueueOptions, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';

let redisInstance: IORedis | null = null;

export function getRedis(): IORedis {
  if (redisInstance) return redisInstance;
  const url = process.env['REDIS_URL'];
  if (url) {
    redisInstance = new IORedis(url, { maxRetriesPerRequest: null, lazyConnect: false, tls: url.startsWith('rediss://') ? {} : undefined } as any);
    return redisInstance;
  }
  const host = process.env['REDIS_HOST'] || '127.0.0.1';
  const port = Number(process.env['REDIS_PORT'] || 6379);
  const username = process.env['REDIS_USERNAME'] || undefined;
  const password = process.env['REDIS_PASSWORD'] || undefined;
  redisInstance = new IORedis({ host, port, username, password, maxRetriesPerRequest: null });
  return redisInstance;
}

export type ImportJobData = {
  type: 'artist' | 'shows' | 'catalog' | 'wrapup';
  artistId: string;
  tmAttractionId?: string;
  spotifyId?: string;
};

export const IMPORT_QUEUE_NAME = 'import';

const defaultJobOptions: JobsOptions = {
  attempts: 4,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 24 * 3600 },
};

export function getImportQueue() {
  const connection = getRedis();
  const options: QueueOptions = { connection, defaultJobOptions };
  return new Queue<ImportJobData>(IMPORT_QUEUE_NAME, options);
}

export function getImportEvents() {
  const connection = getRedis();
  return new QueueEvents(IMPORT_QUEUE_NAME, { connection });
}

export function createImportWorker(concurrency = 5, options?: Omit<WorkerOptions, 'connection'>) {
  const connection = getRedis();
  return new Worker<ImportJobData>(
    IMPORT_QUEUE_NAME,
    async (job) => {
      const { data } = job;
      const { runFullImport } = await import('../orchestrators/ArtistImportOrchestrator');
      // For now, run full import for any job type; phases can be split later
      await runFullImport(data.artistId);
      return { ok: true };
    },
    { connection, concurrency, ...(options || {}) },
  );
}

export async function enqueueArtistImport(artistId: string) {
  const queue = getImportQueue();
  const jobId = `import:artist:${artistId}`;
  await queue.add('artist', { type: 'artist', artistId }, { jobId, priority: 1 });
}