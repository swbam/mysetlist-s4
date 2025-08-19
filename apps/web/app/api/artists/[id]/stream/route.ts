import { NextResponse } from "next/server";
import { ProgressBus, onProgress, offProgress, report } from "~/lib/services/progress/ProgressBus";
import { runFullImport } from "~/lib/services/orchestrators/ArtistImportOrchestrator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const artistId = params.id;
  
  // Create a ReadableStream for SSE
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;
  
  const stream = new ReadableStream({
    start(controller) {
      console.log(`[SSE] Starting stream for artist ${artistId}`);
      
      // Send initial connection event
      const connectEvent = `event: connected\ndata: ${JSON.stringify({
        artistId,
        timestamp: new Date().toISOString(),
        message: "Connected to progress stream"
      })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      // Set up progress listener
      const progressListener = (event: any) => {
        try {
          console.log(`[SSE] Progress event for ${artistId}:`, event);
          
          // Format progress event
          const progressEvent = `event: progress\ndata: ${JSON.stringify({
            artistId,
            stage: event.stage,
            progress: event.progress,
            message: event.message,
            timestamp: event.at || new Date().toISOString(),
            isComplete: event.stage === 'completed',
            hasError: event.stage === 'failed' || !!event.error,
            errorMessage: event.error
          })}\n\n`;
          
          controller.enqueue(encoder.encode(progressEvent));
          
          // Send completion or error events
          if (event.stage === 'completed') {
            const completeEvent = `event: complete\ndata: ${JSON.stringify({
              artistId,
              stage: event.stage,
              progress: 100,
              message: event.message,
              timestamp: event.at || new Date().toISOString(),
              isComplete: true
            })}\n\n`;
            controller.enqueue(encoder.encode(completeEvent));
          } else if (event.stage === 'failed' || event.error) {
            const errorEvent = `event: error\ndata: ${JSON.stringify({
              artistId,
              stage: event.stage,
              progress: event.progress || 0,
              message: event.error || event.message,
              timestamp: event.at || new Date().toISOString(),
              hasError: true
            })}\n\n`;
            controller.enqueue(encoder.encode(errorEvent));
          }
        } catch (err) {
          console.error(`[SSE] Error handling progress event for ${artistId}:`, err);
        }
      };

      // Register the listener
      onProgress(artistId, progressListener);
      
      // Send keep-alive ping every 30 seconds
      intervalId = setInterval(() => {
        try {
          const keepAlive = `event: ping\ndata: ${JSON.stringify({
            timestamp: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(encoder.encode(keepAlive));
        } catch (err) {
          console.error(`[SSE] Error sending keep-alive for ${artistId}:`, err);
        }
      }, 30000);

      // Start the import process
      queueMicrotask(async () => {
        try {
          console.log(`[SSE] Starting import for artist ${artistId}`);
          await report(artistId, "initializing", 0, "Starting import process...");
          await runFullImport(artistId);
        } catch (error) {
          console.error(`[SSE] Import failed for artist ${artistId}:`, error);
          try {
            await report(artistId, "failed", 0, `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
              error: error instanceof Error ? error.stack : String(error)
            });
          } catch (reportError) {
            console.error(`[SSE] Failed to report error for artist ${artistId}:`, reportError);
          }
        }
      });

      // Store cleanup function
      (controller as any)._cleanup = () => {
        console.log(`[SSE] Cleaning up stream for artist ${artistId}`);
        offProgress(artistId, progressListener);
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      };
    },
    
    cancel() {
      console.log(`[SSE] Stream cancelled for artist ${artistId}`);
      if ((this as any)._cleanup) {
        (this as any)._cleanup();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
