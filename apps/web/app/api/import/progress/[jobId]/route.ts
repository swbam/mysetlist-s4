import { NextRequest } from "next/server";
import { getImportStatus } from "~/lib/import-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  // jobId already extracted above
  
  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: "connected",
        jobId,
        timestamp: new Date().toISOString()
      })}\n\n`));

      // Set up interval to check import status
      const interval = setInterval(async () => {
        try {
          const status = await getImportStatus(jobId, 'job');
          
          if (status) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: "progress",
              ...status
            })}\n\n`));

            // Close stream if import is completed or failed
            if (status.stage === 'completed' || status.stage === 'failed') {
              clearInterval(interval);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: "finished",
                stage: status.stage,
                timestamp: new Date().toISOString()
              })}\n\n`));
              controller.close();
            }
          }
        } catch (error) {
          console.error("SSE error:", error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString()
          })}\n\n`));
        }
      }, 2000); // Check every 2 seconds

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });

      // Auto-close after 5 minutes
      setTimeout(() => {
        clearInterval(interval);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "timeout",
          message: "Connection timeout",
          timestamp: new Date().toISOString()
        })}\n\n`));
        controller.close();
      }, 5 * 60 * 1000);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}