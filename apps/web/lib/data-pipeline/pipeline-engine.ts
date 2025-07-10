import { createClient } from '~/lib/supabase/server';
import { Queue } from 'bull';
import Redis from 'ioredis';

export interface PipelineConfig {
  id: string;
  name: string;
  description: string;
  source: {
    type: 'api' | 'database' | 'webhook' | 'stream';
    config: Record<string, any>;
    schedule?: string; // cron expression
  };
  processors: Array<{
    id: string;
    type: 'transform' | 'validate' | 'enrich' | 'filter' | 'aggregate';
    config: Record<string, any>;
    order: number;
  }>;
  destination: {
    type: 'database' | 'cache' | 'webhook' | 'stream';
    config: Record<string, any>;
  };
  errorHandling: {
    retries: number;
    backoff: 'exponential' | 'linear' | 'fixed';
    deadLetter: boolean;
  };
  performance: {
    batchSize: number;
    concurrency: number;
    timeout: number;
    cacheStrategy: 'none' | 'redis' | 'memory';
  };
  monitoring: {
    enabled: boolean;
    metrics: string[];
    alerting: {
      enabled: boolean;
      thresholds: Record<string, number>;
      channels: string[];
    };
  };
  active: boolean;
}

export interface PipelineJob {
  id: string;
  pipelineId: string;
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  attempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata: Record<string, any>;
}

export interface PipelineMetrics {
  pipelineId: string;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  avgProcessingTime: number;
  throughput: number; // jobs per second
  errorRate: number;
  lastProcessed: Date;
  performance: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface DataProcessor {
  id: string;
  type: string;
  process(data: any, config: Record<string, any>): Promise<any>;
  validate(config: Record<string, any>): boolean;
}

class RealTimeDataPipeline {
  private supabase: ReturnType<typeof createClient>;
  private redis: Redis;
  private queues: Map<string, Queue> = new Map();
  private processors: Map<string, DataProcessor> = new Map();
  private metrics: Map<string, PipelineMetrics> = new Map();
  private isInitialized = false;

  constructor() {
    this.supabase = createClient();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
    
    this.initializeProcessors();
  }

  private initializeProcessors() {
    // Transform processor
    this.processors.set('transform', {
      id: 'transform',
      type: 'transform',
      async process(data: any, config: Record<string, any>): Promise<any> {
        const { fields, mapping, defaultValues } = config;
        
        let transformed = { ...data };
        
        // Apply field mapping
        if (mapping) {
          for (const [from, to] of Object.entries(mapping)) {
            if (data[from] !== undefined) {
              transformed[to] = data[from];
              delete transformed[from];
            }
          }
        }
        
        // Apply default values
        if (defaultValues) {
          for (const [field, value] of Object.entries(defaultValues)) {
            if (transformed[field] === undefined) {
              transformed[field] = value;
            }
          }
        }
        
        // Filter fields
        if (fields) {
          const filtered: any = {};
          for (const field of fields) {
            if (transformed[field] !== undefined) {
              filtered[field] = transformed[field];
            }
          }
          transformed = filtered;
        }
        
        return transformed;
      },
      validate(config: Record<string, any>): boolean {
        return true; // Basic validation
      }
    });

    // Validate processor
    this.processors.set('validate', {
      id: 'validate',
      type: 'validate',
      async process(data: any, config: Record<string, any>): Promise<any> {
        const { schema, required, types } = config;
        
        // Check required fields
        if (required) {
          for (const field of required) {
            if (data[field] === undefined || data[field] === null) {
              throw new Error(`Required field '${field}' is missing`);
            }
          }
        }
        
        // Check types
        if (types) {
          for (const [field, expectedType] of Object.entries(types)) {
            if (data[field] !== undefined && typeof data[field] !== expectedType) {
              throw new Error(`Field '${field}' must be of type '${expectedType}'`);
            }
          }
        }
        
        return data;
      },
      validate(config: Record<string, any>): boolean {
        return true;
      }
    });

    // Enrich processor
    this.processors.set('enrich', {
      id: 'enrich',
      type: 'enrich',
      async process(data: any, config: Record<string, any>): Promise<any> {
        const { enrichments } = config;
        let enriched = { ...data };
        
        for (const enrichment of enrichments || []) {
          switch (enrichment.type) {
            case 'timestamp':
              enriched[enrichment.field] = new Date().toISOString();
              break;
            case 'uuid':
              enriched[enrichment.field] = crypto.randomUUID();
              break;
            case 'lookup':
              // Perform database lookup
              const supabase = await createClient();
              const { data: lookupData } = await supabase
                .from(enrichment.table)
                .select(enrichment.select || '*')
                .eq(enrichment.key, data[enrichment.localKey])
                .single();
              
              if (lookupData) {
                enriched[enrichment.field] = lookupData;
              }
              break;
            case 'geolocation':
              // Add geolocation data
              if (data.ip) {
                // Mock geolocation - in production, use a real service
                enriched.location = {
                  country: 'US',
                  city: 'New York',
                  lat: 40.7128,
                  lng: -74.0060
                };
              }
              break;
          }
        }
        
        return enriched;
      },
      validate(config: Record<string, any>): boolean {
        return Array.isArray(config.enrichments);
      }
    });

    // Filter processor
    this.processors.set('filter', {
      id: 'filter',
      type: 'filter',
      async process(data: any, config: Record<string, any>): Promise<any> {
        const { conditions, operator = 'and' } = config;
        
        let passes = true;
        
        for (const condition of conditions || []) {
          const { field, operator: condOperator, value } = condition;
          const fieldValue = data[field];
          
          let conditionPasses = false;
          
          switch (condOperator) {
            case 'equals':
              conditionPasses = fieldValue === value;
              break;
            case 'not_equals':
              conditionPasses = fieldValue !== value;
              break;
            case 'greater_than':
              conditionPasses = fieldValue > value;
              break;
            case 'less_than':
              conditionPasses = fieldValue < value;
              break;
            case 'contains':
              conditionPasses = String(fieldValue).includes(String(value));
              break;
            case 'regex':
              conditionPasses = new RegExp(value).test(String(fieldValue));
              break;
            case 'in':
              conditionPasses = Array.isArray(value) && value.includes(fieldValue);
              break;
          }
          
          if (operator === 'and' && !conditionPasses) {
            passes = false;
            break;
          } else if (operator === 'or' && conditionPasses) {
            passes = true;
            break;
          }
        }
        
        if (!passes) {
          throw new Error('Data filtered out');
        }
        
        return data;
      },
      validate(config: Record<string, any>): boolean {
        return Array.isArray(config.conditions);
      }
    });

    // Aggregate processor
    this.processors.set('aggregate', {
      id: 'aggregate',
      type: 'aggregate',
      async process(data: any, config: Record<string, any>): Promise<any> {
        const { groupBy, aggregations, windowSize } = config;
        
        // This is a simplified version - in production, you'd use a proper aggregation system
        const cacheKey = `aggregate:${groupBy}:${JSON.stringify(aggregations)}`;
        
        // Get existing aggregation data
        const existingData = await this.redis.get(cacheKey);
        let aggregated: any = existingData ? JSON.parse(existingData) : {};
        
        // Update aggregation
        for (const [field, type] of Object.entries(aggregations)) {
          if (!aggregated[field]) {
            aggregated[field] = { count: 0, sum: 0, min: null, max: null };
          }
          
          const value = data[field];
          if (value !== undefined && value !== null) {
            aggregated[field].count++;
            
            if (typeof value === 'number') {
              aggregated[field].sum += value;
              aggregated[field].min = aggregated[field].min === null ? value : Math.min(aggregated[field].min, value);
              aggregated[field].max = aggregated[field].max === null ? value : Math.max(aggregated[field].max, value);
            }
          }
        }
        
        // Store back to Redis with TTL
        await this.redis.setex(cacheKey, windowSize || 3600, JSON.stringify(aggregated));
        
        return { ...data, aggregations: aggregated };
      },
      validate(config: Record<string, any>): boolean {
        return config.groupBy && config.aggregations;
      }
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Test connections
    await this.redis.ping();
    await this.supabase;
    
    // Load pipeline configurations
    await this.loadPipelineConfigurations();
    
    this.isInitialized = true;
  }

  private async loadPipelineConfigurations(): Promise<void> {
    const supabase = await this.supabase;
    
    const { data: configs } = await supabase
      .from('pipeline_configs')
      .select('*')
      .eq('active', true);
    
    for (const config of configs || []) {
      await this.createPipeline(config);
    }
  }

  async createPipeline(config: PipelineConfig): Promise<void> {
    const queue = new Queue(`pipeline:${config.id}`, {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    });

    // Configure queue settings
    queue.settings = {
      stalledInterval: 30000,
      maxStalledCount: 1,
    };

    // Set up job processor
    queue.process('process-data', config.performance.concurrency, async (job) => {
      return this.processJob(job.data, config);
    });

    // Set up event listeners
    queue.on('completed', (job) => {
      this.updateMetrics(config.id, 'completed', job);
    });

    queue.on('failed', (job, err) => {
      this.updateMetrics(config.id, 'failed', job, err);
    });

    // Store queue reference
    this.queues.set(config.id, queue);

    // Initialize metrics
    this.metrics.set(config.id, {
      pipelineId: config.id,
      totalJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
      avgProcessingTime: 0,
      throughput: 0,
      errorRate: 0,
      lastProcessed: new Date(),
      performance: {
        cpu: 0,
        memory: 0,
        network: 0,
      },
    });

    // Set up scheduling if configured
    if (config.source.schedule) {
      await this.scheduleDataIngestion(config);
    }
  }

  private async processJob(data: any, config: PipelineConfig): Promise<any> {
    const startTime = Date.now();
    let processedData = data;

    try {
      // Sort processors by order
      const sortedProcessors = config.processors.sort((a, b) => a.order - b.order);

      // Process data through each processor
      for (const processorConfig of sortedProcessors) {
        const processor = this.processors.get(processorConfig.type);
        if (!processor) {
          throw new Error(`Unknown processor type: ${processorConfig.type}`);
        }

        // Validate processor configuration
        if (!processor.validate(processorConfig.config)) {
          throw new Error(`Invalid configuration for processor: ${processorConfig.type}`);
        }

        // Process data
        processedData = await processor.process(processedData, processorConfig.config);
      }

      // Store processed data
      await this.storeProcessedData(processedData, config.destination);

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateProcessingMetrics(config.id, processingTime, true);

      return processedData;
    } catch (error) {
      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateProcessingMetrics(config.id, processingTime, false);

      // Handle error based on configuration
      if (config.errorHandling.deadLetter) {
        await this.sendToDeadLetter(data, config.id, error);
      }

      throw error;
    }
  }

  private async storeProcessedData(data: any, destination: PipelineConfig['destination']): Promise<void> {
    switch (destination.type) {
      case 'database':
        const supabase = await this.supabase;
        const { table, operation = 'insert' } = destination.config;
        
        if (operation === 'insert') {
          await supabase.from(table).insert(data);
        } else if (operation === 'upsert') {
          await supabase.from(table).upsert(data);
        }
        break;

      case 'cache':
        const { key, ttl = 3600 } = destination.config;
        const cacheKey = typeof key === 'string' ? key : this.generateCacheKey(data, key);
        await this.redis.setex(cacheKey, ttl, JSON.stringify(data));
        break;

      case 'webhook':
        const { url, method = 'POST', headers = {} } = destination.config;
        await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify(data),
        });
        break;

      case 'stream':
        // Implement stream output (e.g., Kafka, WebSocket)
        const { topic, partition } = destination.config;
        // This would integrate with your streaming platform
        console.log(`Streaming to ${topic}:${partition}`, data);
        break;
    }
  }

  private generateCacheKey(data: any, keyTemplate: any): string {
    if (typeof keyTemplate === 'string') {
      return keyTemplate.replace(/\{(\w+)\}/g, (match, field) => data[field] || match);
    }
    return `cache:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendToDeadLetter(data: any, pipelineId: string, error: any): Promise<void> {
    const supabase = await this.supabase;
    
    await supabase.from('pipeline_dead_letters').insert({
      pipeline_id: pipelineId,
      data,
      error: error.message,
      created_at: new Date().toISOString(),
    });
  }

  private updateProcessingMetrics(pipelineId: string, processingTime: number, success: boolean): void {
    const metrics = this.metrics.get(pipelineId);
    if (!metrics) return;

    metrics.totalJobs++;
    if (success) {
      metrics.successfulJobs++;
    } else {
      metrics.failedJobs++;
    }

    // Update average processing time
    metrics.avgProcessingTime = (metrics.avgProcessingTime + processingTime) / 2;

    // Update error rate
    metrics.errorRate = (metrics.failedJobs / metrics.totalJobs) * 100;

    // Update last processed time
    metrics.lastProcessed = new Date();

    // Calculate throughput (jobs per second over last minute)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    // This is simplified - in production, you'd track job timestamps
    metrics.throughput = metrics.totalJobs / 60;
  }

  private updateMetrics(pipelineId: string, status: string, job: any, error?: any): void {
    // Update metrics based on job completion
    const metrics = this.metrics.get(pipelineId);
    if (metrics) {
      metrics.lastProcessed = new Date();
    }
  }

  async scheduleDataIngestion(config: PipelineConfig): Promise<void> {
    // This would integrate with a cron scheduler
    // For now, we'll simulate scheduling
    console.log(`Scheduling data ingestion for pipeline ${config.id} with schedule ${config.source.schedule}`);
  }

  async addJob(pipelineId: string, data: any, options: any = {}): Promise<string> {
    const queue = this.queues.get(pipelineId);
    if (!queue) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const job = await queue.add('process-data', data, {
      removeOnComplete: 10,
      removeOnFail: 5,
      attempts: 3,
      backoff: 'exponential',
      delay: options.delay || 0,
      ...options,
    });

    return job.id;
  }

  async getMetrics(pipelineId: string): Promise<PipelineMetrics | null> {
    return this.metrics.get(pipelineId) || null;
  }

  async getAllMetrics(): Promise<PipelineMetrics[]> {
    return Array.from(this.metrics.values());
  }

  async getPipelineStatus(pipelineId: string): Promise<{
    active: boolean;
    waiting: number;
    active_jobs: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.queues.get(pipelineId);
    if (!queue) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      active: true,
      waiting: waiting.length,
      active_jobs: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  async pausePipeline(pipelineId: string): Promise<void> {
    const queue = this.queues.get(pipelineId);
    if (queue) {
      await queue.pause();
    }
  }

  async resumePipeline(pipelineId: string): Promise<void> {
    const queue = this.queues.get(pipelineId);
    if (queue) {
      await queue.resume();
    }
  }

  async cleanPipeline(pipelineId: string): Promise<void> {
    const queue = this.queues.get(pipelineId);
    if (queue) {
      await queue.clean(5000, 'completed');
      await queue.clean(5000, 'failed');
    }
  }

  async shutdown(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    await this.redis.quit();
  }
}

// Export singleton instance
export const datalineEngine = new RealTimeDataPipeline();

// Initialize the pipeline engine
export async function initializePipelineEngine(): Promise<void> {
  await datalineEngine.initialize();
}

// Add job to pipeline
export async function addPipelineJob(pipelineId: string, data: any, options?: any): Promise<string> {
  return datalineEngine.addJob(pipelineId, data, options);
}

// Get pipeline metrics
export async function getPipelineMetrics(pipelineId?: string): Promise<PipelineMetrics | PipelineMetrics[]> {
  if (pipelineId) {
    return datalineEngine.getMetrics(pipelineId);
  }
  return datalineEngine.getAllMetrics();
}

// Get pipeline status
export async function getPipelineStatus(pipelineId: string): Promise<any> {
  return datalineEngine.getPipelineStatus(pipelineId);
}

// Pipeline management functions
export async function pausePipeline(pipelineId: string): Promise<void> {
  return datalineEngine.pausePipeline(pipelineId);
}

export async function resumePipeline(pipelineId: string): Promise<void> {
  return datalineEngine.resumePipeline(pipelineId);
}

export async function cleanPipeline(pipelineId: string): Promise<void> {
  return datalineEngine.cleanPipeline(pipelineId);
}