import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// SSE endpoint for sync progress updates
http.route({
  path: "/api/sync-progress",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");
    
    if (!jobId) {
      return new Response("Missing jobId parameter", { status: 400 });
    }

    // Set up SSE headers
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    };

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        controller.enqueue(`data: ${JSON.stringify({ connected: true })}\n\n`);
        
        // Set up polling interval to check job status
        const interval = setInterval(async () => {
          try {
            const progress = await ctx.runQuery(api.syncJobs.getJobProgress, { 
              jobId: jobId as any 
            });
            
            if (progress) {
              controller.enqueue(`data: ${JSON.stringify(progress)}\n\n`);
              
              // Close stream when job is completed or failed
              if (progress.status === "completed" || progress.status === "failed") {
                clearInterval(interval);
                controller.close();
              }
            }
          } catch (error) {
            console.error("Error fetching job progress:", error);
            controller.enqueue(`data: ${JSON.stringify({ error: "Failed to fetch progress" })}\n\n`);
          }
        }, 1000); // Check every second

        // Cleanup on close
        const cleanup = () => {
          clearInterval(interval);
          controller.close();
        };

        // Handle client disconnect
        request.signal?.addEventListener('abort', cleanup);
      }
    });

    return new Response(stream, { headers });
  }),
});

export default http;
