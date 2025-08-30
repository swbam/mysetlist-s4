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
      const body = await req.json() as { artistName?: string };
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

export default http;
