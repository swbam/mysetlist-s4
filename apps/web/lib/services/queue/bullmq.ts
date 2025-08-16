import { Queue, Worker, QueueEvents, JobsOptions, QueueOptions, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';

// Centralized Redis connection using env; supports either REDIS_URL or discrete host/port/username/password.
function createRedis() {
  const url = process.env['REDIS_URL'];
  if (url) {
    return new IORedis(url, { maxRetriesPerRequest: null });
  }
  const host = process.env['REDIS_HOST'] || '127.0.0.1';
  const port = Number(process.env['REDIS_PORT'] || 6379);
  const username = process.env['REDIS_USERNAME'] || undefined;
  const password = process.env['REDIS_PASSWORD'] || undefined;
  return new IORedis({ host, port, username, password, maxRetriesPerRequest: null });
}

const connection = createRedis();

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

const queueOptions: QueueOptions = {
  connection,
  defaultJobOptions,
};

export const importQueue = new Queue<ImportJobData>(IMPORT_QUEUE_NAME, queueOptions);
export const importEvents = new QueueEvents(IMPORT_QUEUE_NAME, { connection });

export function createImportWorker(concurrency = 5, options?: Omit<WorkerOptions, 'connection'>) {
  return new Worker<ImportJobData>(
    IMPORT_QUEUE_NAME,
    async (job) => {
      const { data } = job;
      // Defer to orchestrator entry points based on job type
      const { runFullImport } = await import('../orchestrators/ArtistImportOrchestrator');
      if (data.type === 'artist') {
        // Kick full import
        await runFullImport(data.artistId);
        return { ok: true };
      }
      if (data.type === 'shows') {
        // Phase-limited processing can be added later if needed
        await runFullImport(data.artistId);
        return { ok: true };
      }
      if (data.type === 'catalog') {
        await runFullImport(data.artistId);
        return { ok: true };
      }
      if (data.type === 'wrapup') {
        await runFullImport(data.artistId);
        return { ok: true };
      }
      return { ok: true };
    },
    { connection, concurrency, ...(options || {}) },
  );
}

export async function enqueueArtistImport(artistId: string) {
  const jobId = `import:artist:${artistId}`;
  await importQueue.add('artist', { type: 'artist', artistId }, { jobId, priority: 1 });
}