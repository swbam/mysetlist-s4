import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

const http = httpRouter();

// API endpoint to start a sync job
http.route({
  path: "/api/start-sync",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json();
      const { artistName } = body;
      
      if (!artistName) {
        return new Response(JSON.stringify({ error: "Missing artistName" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // Start a full sync job
        const jobId = await ctx.runMutation(api.syncJobs.create, {
          type: "full_sync",
          entityId: JSON.stringify({ artistName }),
          priority: 10,
        });
       
       // Schedule the sync to run immediately
       await ctx.scheduler.runAfter(0, internal.syncJobs.processFullSync, {
         jobId,
       });
      
      return new Response(JSON.stringify({ jobId }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error starting sync:", error);
      return new Response(JSON.stringify({ error: "Failed to start sync" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Health check endpoint for production monitoring
http.route({
  path: "/api/health",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    try {
      const health = await ctx.runQuery(api.health.healthCheck, {});
      const status = health.status === "healthy" ? 200 : 503;
      
      return new Response(JSON.stringify(health), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        status: "error", 
        error: "Health check failed" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// SSE endpoint for sync progress updates
http.route({
  path: "/api/sync-progress",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");
    
    if (!jobId) {
      return new Response("Missing jobId parameter", { status: 400 });
    }

    // Set up SSE headers
    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    });

    // Create a readable stream for SSE
     const stream = new ReadableStream({
       start(controller) {
         const sendProgress = async (): Promise<void> => {
           try {
             const progress = await ctx.runQuery(internal.syncJobs.getJobById, { jobId: jobId as any });
             
             if (progress) {
               const data = {
                 status: progress.status,
                 currentPhase: progress.currentPhase,
                 totalSteps: progress.totalSteps,
                 completedSteps: progress.completedSteps,
                 currentStep: progress.currentStep,
                 itemsProcessed: progress.itemsProcessed,
                 totalItems: progress.totalItems,
                 progressPercentage: progress.progressPercentage,
                 startedAt: progress.startedAt,
                 completedAt: progress.completedAt,
                 errorMessage: progress.errorMessage,
               };
               
               controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
               
               // Close stream if job is completed or failed
               if (progress.status === "completed" || progress.status === "failed") {
                 controller.close();
                 return;
               }
             }
             
             // Continue polling every 1 second
             void setTimeout(() => {
               void sendProgress();
             }, 1000);
           } catch (error) {
             console.error("SSE error:", error);
             controller.error(error);
           }
         };
         
         // Start sending progress updates
         void sendProgress();
       },
     });

    return new Response(stream, { headers });
  }),
});

export default http;
