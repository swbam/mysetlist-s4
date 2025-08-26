"use strict";
// MySetlist-S4 Complete Queue Manager Implementation
// File: apps/web/lib/queues/queue-manager.ts
// REPLACE existing incomplete implementation
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueManager = exports.Priority = exports.QueueName = void 0;
const bullmq_1 = require("bullmq");
const redis_config_1 = require("./redis-config");
const database_1 = require("@repo/database");
// Import processors
const artist_import_processor_1 = require("./processors/artist-import.processor");
const spotify_sync_processor_1 = require("./processors/spotify-sync.processor");
const ticketmaster_sync_processor_1 = require("./processors/ticketmaster-sync.processor");
const scheduled_sync_processor_1 = require("./processors/scheduled-sync.processor");
const trending_processor_1 = require("./processors/trending.processor");
var QueueName;
(function (QueueName) {
    // High priority import queues
    QueueName["ARTIST_IMPORT"] = "artist-import";
    QueueName["ARTIST_QUICK_SYNC"] = "artist-quick-sync";
    // Data sync queues
    QueueName["SPOTIFY_SYNC"] = "spotify-sync";
    QueueName["SPOTIFY_CATALOG"] = "spotify-catalog";
    QueueName["TICKETMASTER_SYNC"] = "ticketmaster-sync";
    QueueName["VENUE_SYNC"] = "venue-sync";
    QueueName["SETLIST_SYNC"] = "setlist-sync";
    // Background processing
    QueueName["IMAGE_PROCESSING"] = "image-processing";
    QueueName["TRENDING_CALC"] = "trending-calc";
    QueueName["CACHE_WARM"] = "cache-warm";
    // Scheduled/recurring jobs
    QueueName["SCHEDULED_SYNC"] = "scheduled-sync";
    QueueName["CLEANUP"] = "cleanup-jobs";
    // Notification/communication
    QueueName["PROGRESS_UPDATE"] = "progress-update";
    QueueName["WEBHOOK"] = "webhook-notify";
})(QueueName || (exports.QueueName = QueueName = {}));
var Priority;
(function (Priority) {
    Priority[Priority["CRITICAL"] = 1] = "CRITICAL";
    Priority[Priority["HIGH"] = 5] = "HIGH";
    Priority[Priority["NORMAL"] = 10] = "NORMAL";
    Priority[Priority["LOW"] = 20] = "LOW";
    Priority[Priority["BACKGROUND"] = 50] = "BACKGROUND";
})(Priority || (exports.Priority = Priority = {}));
// Queue configurations with optimal settings
const queueConfigs = {
    [QueueName.ARTIST_IMPORT]: {
        concurrency: 5,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: { age: 3600, count: 100 },
            removeOnFail: { age: 86400, count: 50 },
            priority: Priority.CRITICAL,
        },
    },
    [QueueName.ARTIST_QUICK_SYNC]: {
        concurrency: 10,
        defaultJobOptions: {
            attempts: 2,
            backoff: { type: "fixed", delay: 1000 },
            removeOnComplete: { age: 1800, count: 50 },
            removeOnFail: { age: 3600, count: 25 },
            priority: Priority.HIGH,
        },
    },
    [QueueName.SPOTIFY_SYNC]: {
        concurrency: 3,
        rateLimit: { max: 30, duration: 1000 }, // Spotify rate limit
        defaultJobOptions: {
            attempts: 5,
            backoff: { type: "exponential", delay: 3000 },
            removeOnComplete: { age: 3600, count: 25 },
            removeOnFail: { age: 7200, count: 15 },
            priority: Priority.NORMAL,
        },
    },
    [QueueName.SPOTIFY_CATALOG]: {
        concurrency: 2,
        rateLimit: { max: 20, duration: 1000 },
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: { age: 7200, count: 15 },
            removeOnFail: { age: 14400, count: 10 },
            priority: Priority.LOW,
        },
    },
    [QueueName.TICKETMASTER_SYNC]: {
        concurrency: 3,
        rateLimit: { max: 200, duration: 1000 }, // Ticketmaster generous limits
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "fixed", delay: 2000 },
            removeOnComplete: { age: 3600, count: 25 },
            removeOnFail: { age: 7200, count: 15 },
            priority: Priority.NORMAL,
        },
    },
    [QueueName.VENUE_SYNC]: {
        concurrency: 2,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: { age: 7200, count: 15 },
            removeOnFail: { age: 14400, count: 10 },
            priority: Priority.LOW,
        },
    },
    [QueueName.SETLIST_SYNC]: {
        concurrency: 2,
        rateLimit: { max: 60, duration: 60000 }, // Setlist.fm: 1 request per second
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: { age: 7200, count: 15 },
            removeOnFail: { age: 14400, count: 10 },
            priority: Priority.LOW,
        },
    },
    [QueueName.TRENDING_CALC]: {
        concurrency: 2,
        defaultJobOptions: {
            attempts: 2,
            backoff: { type: "fixed", delay: 1000 },
            removeOnComplete: { age: 3600, count: 10 },
            removeOnFail: { age: 7200, count: 5 },
            priority: Priority.BACKGROUND,
        },
    },
    [QueueName.SCHEDULED_SYNC]: {
        concurrency: 1, // Sequential execution for scheduled jobs
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 10000 },
            removeOnComplete: { age: 14400, count: 10 },
            removeOnFail: { age: 86400, count: 5 },
            priority: Priority.BACKGROUND,
        },
    },
    [QueueName.CLEANUP]: {
        concurrency: 1,
        defaultJobOptions: {
            attempts: 2,
            backoff: { type: "fixed", delay: 5000 },
            removeOnComplete: { age: 86400, count: 5 },
            removeOnFail: { age: 172800, count: 3 },
            priority: Priority.BACKGROUND,
        },
    },
    [QueueName.CACHE_WARM]: {
        concurrency: 3,
        defaultJobOptions: {
            attempts: 1, // Don't retry cache warming
            removeOnComplete: { age: 1800, count: 10 },
            removeOnFail: { age: 3600, count: 5 },
            priority: Priority.BACKGROUND,
        },
    },
    [QueueName.IMAGE_PROCESSING]: {
        concurrency: 2,
        defaultJobOptions: {
            attempts: 2,
            backoff: { type: "fixed", delay: 2000 },
            removeOnComplete: { age: 3600, count: 20 },
            removeOnFail: { age: 7200, count: 10 },
            priority: Priority.LOW,
        },
    },
    [QueueName.PROGRESS_UPDATE]: {
        concurrency: 5,
        defaultJobOptions: {
            attempts: 1, // Don't retry progress updates
            removeOnComplete: { age: 600, count: 50 },
            removeOnFail: { age: 1200, count: 25 },
            priority: Priority.HIGH,
        },
    },
    [QueueName.WEBHOOK]: {
        concurrency: 3,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: { age: 3600, count: 25 },
            removeOnFail: { age: 7200, count: 15 },
            priority: Priority.NORMAL,
        },
    },
};
class QueueManager {
    queues = new Map();
    workers = new Map();
    queueEvents = new Map();
    isInitialized = false;
    shutdownPromise;
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            console.log('🔄 Initializing Queue Manager...');
            const connection = (0, redis_config_1.getBullMQConnection)();
            // Test connection first
            const testRedis = new (await import('ioredis')).default(connection);
            await testRedis.ping();
            testRedis.disconnect();
            // Initialize core queues first
            const coreQueues = [
                QueueName.ARTIST_IMPORT,
                QueueName.SPOTIFY_SYNC,
                QueueName.TICKETMASTER_SYNC,
                QueueName.SCHEDULED_SYNC,
                QueueName.TRENDING_CALC,
            ];
            // Create core queues and workers
            for (const queueName of coreQueues) {
                await this.createQueue(queueName);
                await this.createWorker(queueName);
            }
            // Initialize remaining queues
            const remainingQueues = Object.values(QueueName).filter(q => !coreQueues.includes(q));
            for (const queueName of remainingQueues) {
                await this.createQueue(queueName);
                await this.createWorker(queueName);
            }
            this.isInitialized = true;
            console.log('✅ Queue Manager initialized successfully');
        }
        catch (error) {
            console.error('❌ Queue Manager initialization failed:', error);
            throw error;
        }
    }
    async createQueue(name) {
        const config = queueConfigs[name];
        const queue = new bullmq_1.Queue(name, {
            connection: (0, redis_config_1.getBullMQConnection)(),
            ...config.defaultJobOptions && { defaultJobOptions: config.defaultJobOptions },
        });
        // Set up queue events
        const queueEvents = new bullmq_1.QueueEvents(name, {
            connection: (0, redis_config_1.getBullMQConnection)(),
        });
        queueEvents.on("completed", async ({ jobId, returnvalue }) => {
            console.log(`✅ Job ${jobId} completed in ${name}:`, returnvalue);
            await this.logJobToDatabase(jobId, name, 'completed', returnvalue);
        });
        queueEvents.on("failed", async ({ jobId, failedReason }) => {
            console.error(`❌ Job ${jobId} failed in ${name}:`, failedReason);
            await this.logJobToDatabase(jobId, name, 'failed', { error: failedReason });
        });
        queueEvents.on("progress", ({ jobId, data }) => {
            console.log(`📊 Job ${jobId} progress in ${name}:`, data);
        });
        this.queues.set(name, queue);
        this.queueEvents.set(name, queueEvents);
    }
    async createWorker(name) {
        const config = queueConfigs[name];
        const processor = this.getProcessor(name);
        if (!processor) {
            console.warn(`⚠️ No processor found for queue: ${name}`);
            return;
        }
        const worker = new bullmq_1.Worker(name, processor, {
            connection: (0, redis_config_1.getBullMQConnection)(),
            concurrency: config.concurrency,
            limiter: config.rateLimit,
            // Add job staleness detection
            stalledInterval: 30000, // 30 seconds
            maxStalledCount: 3,
        });
        worker.on("completed", (job) => {
            console.log(`Worker completed job ${job.id} in ${name}`);
        });
        worker.on("failed", (job, err) => {
            console.error(`Worker failed job ${job?.id} in ${name}:`, err.message);
        });
        worker.on("error", (err) => {
            console.error(`Worker error in ${name}:`, err);
        });
        // Graceful shutdown handling
        worker.on("stalled", (jobId) => {
            console.warn(`⚠️ Job ${jobId} stalled in ${name}`);
        });
        this.workers.set(name, worker);
    }
    getProcessor(queueName) {
        switch (queueName) {
            case QueueName.ARTIST_IMPORT:
                return artist_import_processor_1.ArtistImportProcessor.process;
            case QueueName.SPOTIFY_SYNC:
            case QueueName.SPOTIFY_CATALOG:
                return spotify_sync_processor_1.SpotifySyncProcessor.process;
            case QueueName.TICKETMASTER_SYNC:
                return ticketmaster_sync_processor_1.TicketmasterSyncProcessor.process;
            case QueueName.SCHEDULED_SYNC:
                return scheduled_sync_processor_1.ScheduledSyncProcessor.process;
            case QueueName.TRENDING_CALC:
                return trending_processor_1.TrendingProcessor.process;
            // Add more processors as needed
            default:
                return null;
        }
    }
    async logJobToDatabase(jobId, queueName, status, result) {
        try {
            await database_1.db
                .update(database_1.queueJobs)
                .set({
                status,
                ...(status === 'completed' && { completedAt: new Date() }),
                ...(result && {
                    result: typeof result === 'object' ? JSON.stringify(result) : result
                }),
            })
                .where((0, database_1.sql) `job_id = ${jobId}`);
        }
        catch (error) {
            console.error('Failed to log job to database:', error);
        }
    }
    async addJob(queueName, jobName, data, options) {
        await this.initialize();
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        // Generate unique job ID
        const jobId = `${queueName}_${jobName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Log job to database
        try {
            await database_1.db.insert(database_1.queueJobs).values({
                queueName,
                jobId,
                jobData: typeof data === 'object' ? JSON.stringify(data) : data,
                status: 'pending',
            });
        }
        catch (error) {
            console.error('Failed to log job to database:', error);
        }
        const job = await queue.add(jobName, data, {
            jobId,
            ...options,
        });
        console.log(`📋 Job ${job.id} added to ${queueName}: ${jobName}`);
        return job;
    }
    async getQueueStats(queueName) {
        await this.initialize();
        const queue = this.queues.get(queueName);
        if (!queue)
            return null;
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaiting(),
            queue.getActive(),
            queue.getCompleted(),
            queue.getFailed(),
            queue.getDelayed(),
        ]);
        return {
            name: queueName,
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            delayed: delayed.length,
            total: waiting.length + active.length + completed.length + failed.length + delayed.length,
        };
    }
    async getAllStats() {
        await this.initialize();
        const stats = await Promise.all(Array.from(this.queues.keys()).map(queueName => this.getQueueStats(queueName)));
        return stats.filter(Boolean);
    }
    async getHealthStatus() {
        const errors = [];
        // Check initialization
        if (!this.isInitialized) {
            errors.push('Queue manager not initialized');
        }
        // Test Redis connection
        let redisHealthy = false;
        try {
            const testRedis = new (await import('ioredis')).default((0, redis_config_1.getBullMQConnection)());
            await testRedis.ping();
            testRedis.disconnect();
            redisHealthy = true;
        }
        catch (error) {
            errors.push(`Redis connection failed: ${error}`);
        }
        // Check worker health
        for (const [name, worker] of this.workers) {
            if (worker.isRunning()) {
                // Worker is healthy
            }
            else {
                errors.push(`Worker ${name} not running`);
            }
        }
        return {
            healthy: errors.length === 0,
            initialized: this.isInitialized,
            queues: this.queues.size,
            workers: this.workers.size,
            redis: redisHealthy,
            errors,
        };
    }
    async pauseQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (queue) {
            await queue.pause();
            console.log(`⏸️ Queue ${queueName} paused`);
        }
    }
    async resumeQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (queue) {
            await queue.resume();
            console.log(`▶️ Queue ${queueName} resumed`);
        }
    }
    async cleanQueue(queueName, grace = 1000) {
        const queue = this.queues.get(queueName);
        if (queue) {
            await queue.clean(grace, 'completed');
            await queue.clean(grace, 'failed');
            console.log(`🧹 Queue ${queueName} cleaned`);
        }
    }
    async shutdown() {
        if (this.shutdownPromise) {
            return this.shutdownPromise;
        }
        this.shutdownPromise = this._performShutdown();
        return this.shutdownPromise;
    }
    async _performShutdown() {
        console.log('🔄 Shutting down Queue Manager...');
        // Close workers first (gracefully finish current jobs)
        const workerPromises = Array.from(this.workers.values()).map(worker => worker.close());
        // Close queues
        const queuePromises = Array.from(this.queues.values()).map(queue => queue.close());
        // Close queue events
        const eventPromises = Array.from(this.queueEvents.values()).map(events => events.close());
        await Promise.all([...workerPromises, ...queuePromises, ...eventPromises]);
        this.workers.clear();
        this.queues.clear();
        this.queueEvents.clear();
        this.isInitialized = false;
        console.log('✅ Queue Manager shut down successfully');
    }
    // Convenience method for common job types
    async addArtistImportJob(data, options) {
        return this.addJob(QueueName.ARTIST_IMPORT, 'import-artist', data, {
            priority: data.priority || Priority.CRITICAL,
            ...options,
        });
    }
    async addSpotifySyncJob(data, options) {
        return this.addJob(QueueName.SPOTIFY_SYNC, 'sync-spotify', data, {
            priority: Priority.NORMAL,
            ...options,
        });
    }
    async addScheduledSyncJob(data, options) {
        return this.addJob(QueueName.SCHEDULED_SYNC, 'scheduled-sync', data, {
            priority: Priority.BACKGROUND,
            ...options,
        });
    }
}
// Export singleton instance
exports.queueManager = new QueueManager();
// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await exports.queueManager.shutdown();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await exports.queueManager.shutdown();
    process.exit(0);
});
