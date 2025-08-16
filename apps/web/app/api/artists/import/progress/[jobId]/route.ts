import { type NextRequest, NextResponse } from "next/server";
import { getImportStatus } from "~/lib/import-status";
import { Redis } from "ioredis";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

// Initialize Redis client with correct credentials
const redis = new Redis({
  username: 'default',
  password: 'D0ph9gV9LPCbAq271oij61iRaoqnK3o6',
  host: 'redis-15718.c44.us-east-1-2.ec2.redns.redis-cloud.com',
  port: 15718,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json(
      { error: "Job ID is required" },
      { status: 400 }
    );
  }

  // Check for SSE support
  const acceptHeader = request.headers.get("accept");
  if (acceptHeader && acceptHeader.includes("text/event-stream")) {
    // Return Server-Sent Events stream with Redis pub/sub
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        // Create a Redis subscriber for real-time updates
        const subscriber = new Redis({
          username: 'default',
          password: 'D0ph9gV9LPCbAq271oij61iRaoqnK3o6',
          host: 'redis-15718.c44.us-east-1-2.ec2.redns.redis-cloud.com',
          port: 15718,
        });
        
        const channelName = `import:progress:${jobId}`;
        let heartbeatInterval: NodeJS.Timeout;
        let checkCacheInterval: NodeJS.Timeout;
        
        try {
          // Subscribe to progress updates
          await subscriber.subscribe(channelName);
          
          // Send initial connection message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "connected", jobId })}\n\n`)
          );
          
          // Check for cached progress immediately
          const cachedProgress = await redis.get(`import:status:${jobId}`);
          if (cachedProgress) {
            const progress = JSON.parse(cachedProgress);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
            );
            
            if (progress.stage === "completed" || progress.stage === "failed") {
              subscriber.unsubscribe();
              subscriber.quit();
              setTimeout(() => controller.close(), 1000);
              return;
            }
          } else {
            // Send initial status from database
            const status = await getImportStatus(jobId);
            if (status) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(status)}\n\n`)
              );
            } else {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  stage: "initializing",
                  progress: 0,
                  message: "Preparing import...",
                })}\n\n`)
              );
            }
          }
          
          // Handle Redis pub/sub messages
          subscriber.on("message", (channel, message) => {
            if (channel === channelName) {
              try {
                const progress = JSON.parse(message);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
                );
                
                if (progress.stage === "completed" || progress.stage === "failed") {
                  clearInterval(heartbeatInterval);
                  clearInterval(checkCacheInterval);
                  subscriber.unsubscribe();
                  subscriber.quit();
                  setTimeout(() => controller.close(), 1000);
                }
              } catch (error) {
                console.error("Error parsing progress message:", error);
              }
            }
          });
          
          // Send heartbeat every 30 seconds
          heartbeatInterval = setInterval(() => {
            controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
          }, 30000);
          
          // Fallback: Check cache every 2 seconds in case pub/sub misses
          checkCacheInterval = setInterval(async () => {
            try {
              const cached = await redis.get(`import:status:${jobId}`);
              if (cached) {
                const progress = JSON.parse(cached);
                if (progress.stage === "completed" || progress.stage === "failed") {
                  clearInterval(heartbeatInterval);
                  clearInterval(checkCacheInterval);
                  subscriber.unsubscribe();
                  subscriber.quit();
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
                  );
                  setTimeout(() => controller.close(), 1000);
                }
              }
            } catch (error) {
              console.error("Error checking cache:", error);
            }
          }, 2000);
          
          // Handle client disconnect
          request.signal.addEventListener("abort", () => {
            clearInterval(heartbeatInterval);
            clearInterval(checkCacheInterval);
            subscriber.unsubscribe();
            subscriber.quit();
            controller.close();
          });
          
        } catch (error) {
          console.error("SSE stream error:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: "error",
              message: "Failed to establish progress stream",
            })}\n\n`)
          );
          controller.close();
        }
      },
      
      cancel() {
        console.log("SSE stream cancelled for job:", jobId);
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // Regular JSON response for polling
  try {
    const status = await getImportStatus(jobId);
    
    if (!status) {
      return NextResponse.json(
        { error: "Import job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to get import status:", error);
    return NextResponse.json(
      { error: "Failed to get import status" },
      { status: 500 }
    );
  }
}
