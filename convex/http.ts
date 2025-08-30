import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

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