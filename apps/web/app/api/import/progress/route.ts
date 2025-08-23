// MySetlist-S4 Import Progress SSE Endpoint
// Provides real-time updates for artist import progress via Server-Sent Events

import { NextRequest } from "next/server";
import { createRedisClient } from "~/lib/queues/redis-config";
import { getImportStatus, ImportStatusManager } from "~/lib/import-status";

export const runtime = 'nodejs';

// Track active connections for cleanup
const activeConnections = new Set<ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  const artistId = searchParams.get('artistId');
  
  if (!jobId && !artistId) {
    return new Response('Missing jobId or artistId parameter', { status: 400 });
  }

  const identifier = jobId || artistId!;
  const type = jobId ? 'job' : 'artist';

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      activeConnections.add(controller);
      
      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({
        type: 'connected',
        message: 'Connected to import progress stream',
        identifier,
        timestamp: new Date().toISOString(),
      })}\n\n`);

      // Set up Redis subscription for real-time updates
      const redis = createRedisClient();
      const channels = [
        `import:progress:${identifier}`,
      ];

      // Send current status immediately
      sendCurrentStatus(controller, identifier, type);

      // Subscribe to Redis channels for updates
      const subscriber = createRedisClient();
      subscriber.subscribe(...channels, (err) => {
        if (err) {
          console.error('Redis subscription error:', err);
          controller.enqueue(`data: ${JSON.stringify({
            type: 'error',
            message: 'Failed to subscribe to updates',
          })}\n\n`);
        }
      });

      // Handle incoming messages
      subscriber.on('message', (channel, message) => {
        try {
          const data = JSON.parse(message);
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);

          // Auto-close connection if import is complete
          if (data.stage === 'completed' || data.stage === 'failed') {
            setTimeout(() => {
              if (activeConnections.has(controller)) {
                controller.enqueue(`data: ${JSON.stringify({
                  type: 'complete',
                  message: 'Import finished, closing connection',
                })}\n\n`);
                cleanup();
              }
            }, 2000); // Give 2 seconds for final message
          }
        } catch (error) {
          console.error('Error parsing Redis message:', error);
        }
      });

      // Keep-alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        if (activeConnections.has(controller)) {
          controller.enqueue(`data: ${JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString(),
          })}\n\n`);
        } else {
          clearInterval(keepAlive);
        }
      }, 30000);

      // Cleanup function
      const cleanup = () => {
        activeConnections.delete(controller);
        clearInterval(keepAlive);
        subscriber.unsubscribe();
        subscriber.quit();
        
        try {
          controller.close();
        } catch (error) {
          // Stream may already be closed
        }
      };

      // Handle client disconnect
      request.signal?.addEventListener('abort', cleanup);

      // Auto-cleanup after 5 minutes
      setTimeout(cleanup, 5 * 60 * 1000);
    },

    cancel() {
      // Handle stream cancellation
    }
  });

  return new Response(stream, { headers });
}

async function sendCurrentStatus(
  controller: ReadableStreamDefaultController, 
  identifier: string,
  type: 'job' | 'artist'
) {
  try {
    const status = await ImportStatusManager.getImportStatus(identifier, type);
    
    if (status) {
      controller.enqueue(`data: ${JSON.stringify({
        type: 'status',
        ...status,
      })}\n\n`);
    } else {
      controller.enqueue(`data: ${JSON.stringify({
        type: 'not_found',
        message: 'No import status found for this identifier',
        identifier,
      })}\n\n`);
    }
  } catch (error) {
    controller.enqueue(`data: ${JSON.stringify({
      type: 'error',
      message: 'Failed to fetch current status',
      error: error.message,
    })}\n\n`);
  }
}

// Graceful shutdown handler
process.on('SIGTERM', () => {
  activeConnections.forEach(controller => {
    try {
      controller.enqueue(`data: ${JSON.stringify({
        type: 'shutdown',
        message: 'Server shutting down',
      })}\n\n`);
      controller.close();
    } catch (error) {
      // Ignore errors during shutdown
    }
  });
  activeConnections.clear();
});