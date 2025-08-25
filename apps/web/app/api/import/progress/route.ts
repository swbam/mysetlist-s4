// MySetlist-S4 SSE Progress Endpoint
// File: apps/web/app/api/import/progress/route.ts
// Server-Sent Events endpoint for real-time import status updates

import { type NextRequest } from 'next/server';
import { RedisClientFactory } from '~/lib/queues/redis-config';
import { ImportStatusManager } from '~/lib/import-status';
import { createServiceClient } from '~/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('jobId');
  const artistId = searchParams.get('artistId');
  
  if (!jobId && !artistId) {
    return new Response('Missing jobId or artistId parameter', { status: 400 });
  }

  // Verify authentication
  const supabase = createServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const redis = RedisClientFactory.getClient('pubsub');
      
      // Send initial status
      try {
        const currentStatus = await ImportStatusManager.getImportStatus(
          jobId || artistId!,
          jobId ? 'job' : 'artist'
        );
        
        if (currentStatus) {
          const event = `data: ${JSON.stringify({
            type: 'initial',
            ...currentStatus,
          })}\n\n`;
          controller.enqueue(encoder.encode(event));
        }
      } catch (error) {
        console.error('Failed to get initial status:', error);
      }

      // Subscribe to Redis channel
      const channel = jobId ? `import:progress:${jobId}` : `import:progress:${artistId}`;
      const subscriber = redis.duplicate();
      
      try {
        await subscriber.connect();
        
        // Set up message handler
        subscriber.on('message', (receivedChannel: string, message: string) => {
          if (receivedChannel === channel) {
            try {
              const data = JSON.parse(message);
              const event = `data: ${JSON.stringify(data)}\n\n`;
              controller.enqueue(encoder.encode(event));
              
              // If import is complete or failed, close the stream
              if (data.stage === 'completed' || data.stage === 'failed') {
                setTimeout(() => {
                  controller.close();
                  subscriber.disconnect();
                }, 1000);
              }
            } catch (error) {
              console.error('Failed to parse message:', error);
            }
          }
        });

        // Subscribe to channel
        await subscriber.subscribe(channel);
        
        // Send keepalive every 30 seconds
        const keepaliveInterval = setInterval(() => {
          const keepalive = `: keepalive\n\n`;
          try {
            controller.enqueue(encoder.encode(keepalive));
          } catch (error) {
            // Stream might be closed
            clearInterval(keepaliveInterval);
          }
        }, 30000);

        // Handle cleanup
        request.signal.addEventListener('abort', () => {
          clearInterval(keepaliveInterval);
          subscriber.disconnect();
          controller.close();
        });

      } catch (error) {
        console.error('Redis subscription error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Support OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
