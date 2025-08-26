"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueManager = exports.QueueManager = exports.queueConfigs = exports.Priority = exports.QueueName = void 0;
const bullmq_1 = require("bullmq");
const redis_config_1 = require("./redis-config");
// Queue names with purpose
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
// Job priorities (lower number = higher priority)
var Priority;
(function (Priority) {
    Priority[Priority["CRITICAL"] = 1] = "CRITICAL";
    Priority[Priority["HIGH"] = 5] = "HIGH";
    Priority[Priority["NORMAL"] = 10] = "NORMAL";
    Priority[Priority["LOW"] = 20] = "LOW";
    Priority[Priority["BACKGROUND"] = 50] = "BACKGROUND";
})(Priority || (exports.Priority = Priority = {}));
// Queue configurations with optimal settings
exports.queueConfigs = {
    [QueueName.ARTIST_IMPORT]: {
        concurrency: 5,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: { age: 3600, count: 100 },
            removeOnFail: { age: 86400 },
        },
    },
    [QueueName.ARTIST_QUICK_SYNC]: {
        concurrency: 10,
        defaultJobOptions: {
            attempts: 2,
            backoff: { type: "fixed", delay: 1000 },
            removeOnComplete: { age: 1800 },
        },
    },
    [QueueName.SPOTIFY_SYNC]: {
        concurrency: 3,
        rateLimit: { max: 30, duration: 1000 }, // Spotify rate limit
        defaultJobOptions: {
            attempts: 5,
            backoff: { type: "exponential", delay: 3000 },
        },
    },
    [QueueName.SPOTIFY_CATALOG]: {
        concurrency: 2,
        rateLimit: { max: 20, duration: 1000 },
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
        },
    },
    [QueueName.TICKETMASTER_SYNC]: {
        concurrency: 3,
        rateLimit: { max: 20, duration: 1000 }, // Ticketmaster rate limit
        defaultJobOptions: {
            attempts: 4,
            backoff: { type: "exponential", delay: 2000 },
        },
    },
    [QueueName.VENUE_SYNC]: {
        concurrency: 10,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "fixed", delay: 1000 },
        },
    },
    [QueueName.SETLIST_SYNC]: {
        concurrency: 2,
        rateLimit: { max: 10, duration: 1000 }, // Setlist.fm rate limit
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 3000 },
        },
    },
    [QueueName.IMAGE_PROCESSING]: {
        concurrency: 5,
        defaultJobOptions: {
            attempts: 2,
            removeOnComplete: { age: 300 },
        },
    },
    [QueueName.TRENDING_CALC]: {
        concurrency: 1,
        defaultJobOptions: {
            attempts: 2,
            backoff: { type: "fixed", delay: 5000 },
        },
    },
    [QueueName.CACHE_WARM]: {
        concurrency: 5,
        defaultJobOptions: {
            attempts: 1,
            removeOnComplete: { age: 60 },
        },
    },
    [QueueName.SCHEDULED_SYNC]: {
        concurrency: 3,
        defaultJobOptions: {
            attempts: 2,
            backoff: { type: "fixed", delay: 5000 },
        },
    },
    [QueueName.CLEANUP]: {
        concurrency: 1,
        defaultJobOptions: {
            attempts: 1,
            removeOnComplete: { count: 10 },
        },
    },
    [QueueName.PROGRESS_UPDATE]: {
        concurrency: 20,
        defaultJobOptions: {
            attempts: 1,
            removeOnComplete: { age: 60 },
        },
    },
    [QueueName.WEBHOOK]: {
        concurrency: 5,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
        },
    },
};
// Queue manager singleton
class QueueManager {
    static instance;
    queues = new Map();
    workers = new Map();
    events = new Map();
    constructor() { }
    static getInstance() {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }
    // Get or create a queue
    getQueue(name) {
        if (!this.queues.has(name)) {
            const config = exports.queueConfigs[name];
            const queue = new bullmq_1.Queue(name, {
                connection: redis_config_1.bullMQConnection,
                defaultJobOptions: config.defaultJobOptions || {
                    attempts: 3,
                    backoff: { type: "exponential", delay: 2000 },
                    removeOnComplete: { age: 3600 },
                    removeOnFail: { age: 86400 },
                },
            });
            this.queues.set(name, queue);
        }
        return this.queues.get(name);
    }
    // Create a worker for a queue
    createWorker(name, processor) {
        if (this.workers.has(name)) {
            console.warn(`Worker for queue ${name} already exists`);
            return this.workers.get(name);
        }
        const config = exports.queueConfigs[name];
        const workerOptions = {
            connection: redis_config_1.bullMQConnection,
            concurrency: config.concurrency,
            ...(config.rateLimit ? { limiter: config.rateLimit } : {})
        };
        const worker = new bullmq_1.Worker(name, processor, workerOptions);
        // Add error handling
        worker.on("failed", (job, err) => {
            if (job) {
                console.error(`Job ${job.id} in queue ${name} failed:`, err);
            }
        });
        worker.on("error", (err) => {
            console.error(`Worker error in queue ${name}:`, err);
        });
        this.workers.set(name, worker);
        return worker;
    }
    // Get queue events for monitoring
    getQueueEvents(name) {
        if (!this.events.has(name)) {
            const events = new bullmq_1.QueueEvents(name, {
                connection: redis_config_1.bullMQConnection,
            });
            this.events.set(name, events);
        }
        return this.events.get(name);
    }
    // Add a job to a queue
    async addJob(queueName, jobName, data, options) {
        const queue = this.getQueue(queueName);
        return await queue.add(jobName, data, options);
    }
    // Add bulk jobs
    async addBulkJobs(queueName, jobs) {
        const queue = this.getQueue(queueName);
        return await queue.addBulk(jobs);
    }
    // Schedule a recurring job
    async scheduleRecurringJob(queueName, jobName, data, repeatOptions, jobOptions) {
        const queue = this.getQueue(queueName);
        return await queue.add(jobName, data, {
            ...jobOptions,
            repeat: repeatOptions,
        });
    }
    // Get job counts
    async getJobCounts(queueName) {
        const queue = this.getQueue(queueName);
        const counts = await queue.getJobCounts();
        return {
            waiting: counts['waiting'] || 0,
            active: counts['active'] || 0,
            completed: counts['completed'] || 0,
            failed: counts['failed'] || 0,
            delayed: counts['delayed'] || 0,
        };
    }
    // Clean old jobs
    async cleanQueue(queueName, grace = 0, limit = 1000, status) {
        const queue = this.getQueue(queueName);
        if (status) {
            return await queue.clean(grace, limit, status);
        }
        const completed = await queue.clean(grace, limit, "completed");
        const failed = await queue.clean(grace, limit, "failed");
        return [...completed, ...failed];
    }
    // Pause a queue
    async pauseQueue(queueName) {
        const queue = this.getQueue(queueName);
        await queue.pause();
    }
    // Resume a queue
    async resumeQueue(queueName) {
        const queue = this.getQueue(queueName);
        await queue.resume();
    }
    // Close all connections
    async closeAll() {
        const promises = [];
        // Close workers first
        for (const worker of this.workers.values()) {
            promises.push(worker.close());
        }
        // Then close events
        for (const events of this.events.values()) {
            promises.push(events.close());
        }
        // Finally close queues
        for (const queue of this.queues.values()) {
            promises.push(queue.close());
        }
        await Promise.all(promises);
        this.workers.clear();
        this.events.clear();
        this.queues.clear();
    }
    // Get queue metrics
    async getQueueMetrics(queueName) {
        const queue = this.getQueue(queueName);
        const counts = await queue.getJobCounts();
        const isPaused = await queue.isPaused();
        const worker = this.workers.get(queueName);
        return {
            name: queueName,
            counts,
            isPaused,
            workersCount: worker ? 1 : 0,
        };
    }
    // Get all metrics
    async getAllMetrics() {
        const metrics = [];
        for (const queueName of Object.values(QueueName)) {
            const metric = await this.getQueueMetrics(queueName);
            metrics.push(metric);
        }
        return metrics;
    }
}
exports.QueueManager = QueueManager;
// Export singleton instance
exports.queueManager = QueueManager.getInstance();
