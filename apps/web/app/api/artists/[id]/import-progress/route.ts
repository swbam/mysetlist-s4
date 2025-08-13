import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: artistId } = await params;

  if (!artistId) {
    return NextResponse.json(
      { error: "Artist ID is required" },
      { status: 400 },
    );
  }

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Function to send SSE formatted data
      const sendEvent = (eventType: string, data: any) => {
        const eventData = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(eventData));
      };

      // Function to check import status and send updates
      const checkStatus = async () => {
        try {
          const supabase = createRouteHandlerClient({
            cookies: () =>
              ({
                get: () => undefined,
                has: () => false,
                set: () => {},
                delete: () => {},
                getAll: () => [],
                [Symbol.iterator]: function* () {},
              }) as any,
          });

          // Get the most recent import status for this artist
          const { data: importStatus, error } = await supabase
            .from("import_status")
            .select("*")
            .eq("artist_id", artistId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (error && error.code !== "PGRST116") {
            // PGRST116 = no rows returned
            console.error("SSE: Error fetching import status:", error);
            sendEvent("error", {
              message: "Failed to fetch import status",
              details: error.message,
            });
            return false; // Continue polling
          }

          if (!importStatus) {
            // No status found yet, send waiting message
            sendEvent("waiting", {
              stage: "initializing",
              progress: 0,
              message: "Waiting for import to start...",
              timestamp: new Date().toISOString(),
            });
            return true; // Continue polling
          }

          // Transform status to match expected format
          const progressData = {
            stage: importStatus.stage,
            progress: importStatus.percentage || 0,
            message: importStatus.message || "Processing...",
            timestamp: importStatus.updated_at,
            artistId: importStatus.artist_id,
            isComplete: importStatus.stage === "completed",
            hasError: importStatus.stage === "failed",
            errorMessage: importStatus.error,
            startedAt: importStatus.created_at,
            completedAt: importStatus.completed_at,
          };

          // Send progress update
          sendEvent("progress", progressData);

          // Check if we should stop polling
          if (progressData.isComplete || progressData.hasError) {
            // Send final event and close stream
            sendEvent(
              progressData.isComplete ? "complete" : "error",
              progressData,
            );
            return false; // Stop polling
          }

          return true; // Continue polling
        } catch (error) {
          console.error("SSE: Status check failed:", error);
          sendEvent("error", {
            message: "Failed to check import status",
            details: error instanceof Error ? error.message : "Unknown error",
          });
          return true; // Continue polling despite error
        }
      };

      // Send initial connection event
      sendEvent("connected", {
        artistId,
        timestamp: new Date().toISOString(),
        message: "Connected to import progress stream",
      });

      // Start polling
      let pollInterval: NodeJS.Timeout;
      let pollCount = 0;
      const maxPolls = 300; // 5 minutes max (300 * 1 second)

      const startPolling = () => {
        pollInterval = setInterval(async () => {
          pollCount++;

          // Safety: Stop after max polls to prevent infinite streaming
          if (pollCount >= maxPolls) {
            sendEvent("timeout", {
              message: "Import progress monitoring timed out",
              timestamp: new Date().toISOString(),
            });
            clearInterval(pollInterval);
            controller.close();
            return;
          }

          const shouldContinue = await checkStatus();
          if (!shouldContinue) {
            clearInterval(pollInterval);
            controller.close();
          }
        }, 1000); // Poll every 1 second
      };

      // Initial status check
      checkStatus().then((shouldContinue) => {
        if (shouldContinue) {
          startPolling();
        } else {
          controller.close();
        }
      });

      // Cleanup function
      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      };
    },

    cancel() {
      // Client disconnected, clean up
      console.log(
        `SSE: Client disconnected from import progress stream for artist ${artistId}`,
      );
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
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
