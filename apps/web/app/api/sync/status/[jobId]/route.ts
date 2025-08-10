import { getSyncQueue } from "@repo/utils";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    const syncQueue = getSyncQueue();
    const status = await syncQueue.getJobStatus(jobId);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to get sync status:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 },
    );
  }
}

// Server-sent events for real-time updates
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    // Set up SSE headers
    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });

    const stream = new ReadableStream({
      start(controller) {
        const syncQueue = getSyncQueue();

        // Send initial status
        syncQueue.getJobStatus(jobId).then((status) => {
          const data = `data: ${JSON.stringify(status)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        });

        // Set up real-time subscription
        const channel = syncQueue.subscribeToJob(jobId, (payload) => {
          try {
            const data = `data: ${JSON.stringify(payload)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          } catch (error) {
            console.error("SSE encoding error:", error);
          }
        });

        // Cleanup on close
        request.signal.addEventListener("abort", () => {
          channel.unsubscribe();
          controller.close();
        });

        // Keep-alive ping every 30 seconds
        const keepAlive = setInterval(() => {
          try {
            const ping = `: keep-alive\n\n`;
            controller.enqueue(new TextEncoder().encode(ping));
          } catch (error) {
            clearInterval(keepAlive);
            controller.close();
          }
        }, 30000);

        // Cleanup on close
        request.signal.addEventListener("abort", () => {
          clearInterval(keepAlive);
        });
      },
    });

    return new Response(stream, { headers });
  } catch (error) {
    console.error("Failed to set up sync status stream:", error);
    return NextResponse.json(
      { error: "Failed to set up real-time updates" },
      { status: 500 },
    );
  }
}
