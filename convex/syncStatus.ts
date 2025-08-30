import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const status = await ctx.db.query("syncStatus").first();
    return status || {
      isActive: false,
      currentPhase: "idle",
      lastSync: Date.now(),
    };
  },
});

export const updateStatus = internalMutation({
  args: {
    isActive: v.boolean(),
    currentPhase: v.string(),
    lastSync: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("syncStatus").first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        isActive: args.isActive,
        currentPhase: args.currentPhase,
        lastSync: args.lastSync || existing.lastSync,
      });
    } else {
      await ctx.db.insert("syncStatus", {
        isActive: args.isActive,
        currentPhase: args.currentPhase,
        lastSync: args.lastSync || Date.now(),
      });
    }
  },
});
