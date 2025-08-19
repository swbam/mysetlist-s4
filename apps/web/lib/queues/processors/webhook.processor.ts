import { Job } from "bullmq";
import { RedisCache } from "../redis-config";

const cache = new RedisCache();

export interface WebhookJobData {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  payload: Record<string, any>;
  headers?: Record<string, string>;
  retries?: number;
  timeout?: number;
  event?: string;
}

export async function processWebhook(job: Job<WebhookJobData>) {
  const { url, method = 'POST', payload, headers = {}, timeout = 10000, event } = job.data;
  
  try {
    await job.log(`Sending webhook to ${url} for event: ${event || 'unknown'}`);
    await job.updateProgress(10);
    
    // Prepare request headers
    const requestHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'SetlistApp-Webhook/1.0',
      ...headers,
    };
    
    await job.updateProgress(30);
    
    // Send webhook request
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeout),
    });
    
    await job.updateProgress(70);
    
    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}: ${responseText}`);
    }
    
    await job.updateProgress(100);
    await job.log(`Webhook delivered successfully to ${url}`);
    
    return {
      success: true,
      url,
      status: response.status,
      response: responseText,
      event,
    };
    
  } catch (error) {
    console.error(`Webhook failed for ${url}:`, error);
    throw error;
  }
}

// Helper function to queue webhooks
export async function queueWebhook(
  url: string,
  event: string,
  payload: Record<string, any>,
  options?: {
    method?: 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    timeout?: number;
    delay?: number;
  }
) {
  const { queueManager, QueueName } = await import("../queue-manager");
  
  return await queueManager.addJob(
    QueueName.WEBHOOK,
    `webhook-${event}-${Date.now()}`,
    {
      url,
      method: options?.method || 'POST',
      payload: {
        event,
        timestamp: new Date().toISOString(),
        ...payload,
      },
      headers: options?.headers,
      timeout: options?.timeout || 10000,
      event,
    },
    {
      priority: 15,
      delay: options?.delay || 0,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    }
  );
}

// Common webhook events
export const WebhookEvents = {
  ARTIST_IMPORTED: 'artist.imported',
  ARTIST_UPDATED: 'artist.updated',
  SHOWS_SYNCED: 'shows.synced',
  CATALOG_SYNCED: 'catalog.synced',
  IMPORT_FAILED: 'import.failed',
  IMPORT_COMPLETED: 'import.completed',
} as const;