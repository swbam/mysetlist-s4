import { type NextRequest, NextResponse } from "next/server";
import {
  ProgressBus,
  offProgress,
  onProgress,
} from "~/lib/services/progress/ProgressBus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const artistId = params.id;

  if (!artistId) {
    return NextResponse.json(
      { error: "Artist ID is required" },
      { status: 400 },
    );
  }

  console.log(
    `[SSE Import Progress] Starting real-time stream for artist ${artistId}`,
  );

  // Create a readable stream for Server-Sent Events
  const encoder = new TextEncoder();
  let progressListener: ((event: any) => void) | null = null;
  let keepAliveInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Function to send SSE formatted data
      const sendEvent = (eventType: string, data: any) => {
        try {
          const eventData = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(eventData));
        } catch (err) {
          console.error(
            `[SSE Import Progress] Error sending ${eventType} event:`,
            err,
          );
        }
      };

      // Send initial connection event
      sendEvent("connected", {
        artistId,
        timestamp: new Date().toISOString(),
        message: "Connected to real-time import progress stream",
      });

      // Set up real-time progress listener
      progressListener = (event: any) => {
        try {
          console.log(
            `[SSE Import Progress] Real-time progress event for ${artistId}:`,
            event,
          );

          // Format progress event to match what the frontend expects
          const progressData = {
            artistId,
            stage: event.stage,
            progress: event.progress,
            message: event.message,
            timestamp: event.at || new Date().toISOString(),
            isComplete: event.stage === "completed",
            hasError: event.stage === "failed" || !!event.error,
            errorMessage: event.error,
            startedAt: event.startedAt,
            completedAt: event.completedAt,
            totalSongs: event.metadata?.totalSongs,
            totalShows: event.metadata?.totalShows,
            totalVenues: event.metadata?.totalVenues,
          };

          // Send progress update
          sendEvent("progress", progressData);

          // Send completion or error events
          if (event.stage === "completed") {
            sendEvent("complete", {
              ...progressData,
              isComplete: true,
              progress: 100,
            });
          } else if (event.stage === "failed" || event.error) {
            sendEvent("error", {
              ...progressData,
              hasError: true,
              errorMessage: event.error || event.message,
            });
          }
        } catch (err) {
          console.error(
            `[SSE Import Progress] Error handling progress event for ${artistId}:`,
            err,
          );
        }
      };

      // Register the real-time listener
      onProgress(artistId, progressListener);

      // Get current status first
      queueMicrotask(async () => {
        try {
          const currentStatus = await ProgressBus.getStatus(artistId);
          if (currentStatus) {
            console.log(
              `[SSE Import Progress] Sending current status for ${artistId}:`,
              currentStatus,
            );
            sendEvent("progress", {
              artistId,
              stage: currentStatus.stage,
              progress: currentStatus.progress,
              message: currentStatus.message,
              timestamp: currentStatus.at,
              isComplete: currentStatus.stage === "completed",
              hasError:
                currentStatus.stage === "failed" || !!currentStatus.error,
              errorMessage: currentStatus.error,
            });
          } else {
            // No status found yet, send waiting message
            sendEvent("waiting", {
              stage: "initializing",
              progress: 0,
              message: "Waiting for import to start...",
              timestamp: new Date().toISOString(),
              artistId,
            });
          }
        } catch (error) {
          console.error(
            `[SSE Import Progress] Error getting current status for ${artistId}:`,
            error,
          );
          sendEvent("error", {
            message: "Failed to get initial status",
            details: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
            artistId,
          });
        }
      });

      // Send keep-alive ping every 30 seconds
      keepAliveInterval = setInterval(() => {
        try {
          sendEvent("ping", {
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error(
            `[SSE Import Progress] Error sending keep-alive for ${artistId}:`,
            err,
          );
        }
      }, 30000);

      // Store cleanup function
      (controller as any)._cleanup = () => {
        console.log(
          `[SSE Import Progress] Cleaning up stream for artist ${artistId}`,
        );
        if (progressListener) {
          offProgress(artistId, progressListener);
          progressListener = null;
        }
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
      };
    },

    cancel() {
      console.log(
        `[SSE Import Progress] Stream cancelled for artist ${artistId}`,
      );
      if ((this as any)._cleanup) {
        (this as any)._cleanup();
      }
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

// Add OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
