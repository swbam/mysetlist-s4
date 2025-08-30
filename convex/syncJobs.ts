import { query, mutation, internalQuery, internalMutation, internalAction, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    type: v.union(
      v.literal("artist_basic"),
      v.literal("artist_shows"),
      v.literal("artist_catalog"),
      v.literal("trending_sync"),
      v.literal("active_sync"),
      v.literal("full_sync"),
      v.literal("venue_ecosystem_sync")
    ),
    entityId: v.optional(v.string()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("syncJobs", {
      type: args.type,
      entityId: args.entityId,
      priority: args.priority || 1,
      status: "pending",
      retryCount: 0,
      maxRetries: 3,
    });
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("syncJobs")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .collect();
  },
});

export const getPending = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    return await ctx.db
      .query("syncJobs")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(limit);
  },
});

export const processFullSync = internalAction({
  args: { jobId: v.id("syncJobs") },
  handler: async (ctx: ActionCtx, args) => {
    // Mark job as running and initialize progress
    await ctx.runMutation(internal.syncJobs.updateJobStatus, {
      jobId: args.jobId,
      status: "running",
      startedAt: Date.now(),
    });

    await ctx.runMutation(internal.syncJobs.updateJobProgress, {
      jobId: args.jobId,
      currentPhase: "Initializing",
      totalSteps: 4,
      completedSteps: 0,
      currentStep: "Preparing sync job",
      progressPercentage: 0,
    });

    try {
      const job = await ctx.runQuery(internal.syncJobs.getJobById, {
        jobId: args.jobId,
      });

      if (!job || !job.entityId) {
        throw new Error("Job not found or missing entity data");
      }

      const entityData = JSON.parse(job.entityId);
      
      // Step 1: Create or get artist
      await ctx.runMutation(internal.syncJobs.updateJobProgress, {
        jobId: args.jobId,
        currentPhase: "Artist Setup",
        completedSteps: 1,
        currentStep: "Creating or retrieving artist profile",
        progressPercentage: 25,
      });

      const artistSlug = entityData.artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      let artist = await ctx.runQuery(internal.artists.getBySlugInternal, { slug: artistSlug });
      
      if (!artist) {
        const artistId = await ctx.runMutation(internal.artists.createInternal, {
          name: entityData.artistName,
          ticketmasterId: entityData.ticketmasterId,
          genres: entityData.artistData?.genres || [],
          images: entityData.artistData?.images || [],
        });
        artist = await ctx.runQuery(internal.artists.getByIdInternal, { id: artistId });
      }

      if (!artist) {
        throw new Error("Failed to create or retrieve artist");
      }

      // Step 2: Sync shows from Ticketmaster
      await ctx.runMutation(internal.syncJobs.updateJobProgress, {
        jobId: args.jobId,
        currentPhase: "Show Import",
        completedSteps: 2,
        currentStep: "Fetching shows from Ticketmaster",
        progressPercentage: 50,
      });

      // Step 3: Sync catalog from Spotify
      await ctx.runMutation(internal.syncJobs.updateJobProgress, {
        jobId: args.jobId,
        currentPhase: "Catalog Import",
        completedSteps: 3,
        currentStep: "Syncing music catalog from Spotify",
        progressPercentage: 75,
      });

      // Step 4: Finalization
      await ctx.runMutation(internal.syncJobs.updateJobProgress, {
        jobId: args.jobId,
        currentPhase: "Finalizing",
        completedSteps: 4,
        currentStep: "Completing sync process",
        progressPercentage: 100,
      });

      // Mark job as completed
      await ctx.runMutation(internal.syncJobs.updateJobStatus, {
        jobId: args.jobId,
        status: "completed",
        completedAt: Date.now(),
      });

    } catch (error) {
      console.error("Full sync failed:", error);
      
      // Mark job as failed
      await ctx.runMutation(internal.syncJobs.updateJobStatus, {
        jobId: args.jobId,
        status: "failed",
        completedAt: Date.now(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// Internal functions
export const getJobById = internalQuery({
  args: { jobId: v.id("syncJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const updateJobStatus = internalMutation({
  args: {
    jobId: v.id("syncJobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    retryCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      status: args.status,
    };
    
    if (args.startedAt !== undefined) updates.startedAt = args.startedAt;
    if (args.completedAt !== undefined) updates.completedAt = args.completedAt;
    if (args.retryCount !== undefined) updates.retryCount = args.retryCount;
    if (args.errorMessage !== undefined) updates.errorMessage = args.errorMessage;
    
    await ctx.db.patch(args.jobId, updates);
  },
});

export const updateJobProgress = internalMutation({
  args: {
    jobId: v.id("syncJobs"),
    currentPhase: v.optional(v.string()),
    totalSteps: v.optional(v.number()),
    completedSteps: v.optional(v.number()),
    currentStep: v.optional(v.string()),
    itemsProcessed: v.optional(v.number()),
    totalItems: v.optional(v.number()),
    progressPercentage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: any = {};
    
    if (args.currentPhase !== undefined) updates.currentPhase = args.currentPhase;
    if (args.totalSteps !== undefined) updates.totalSteps = args.totalSteps;
    if (args.completedSteps !== undefined) updates.completedSteps = args.completedSteps;
    if (args.currentStep !== undefined) updates.currentStep = args.currentStep;
    if (args.itemsProcessed !== undefined) updates.itemsProcessed = args.itemsProcessed;
    if (args.totalItems !== undefined) updates.totalItems = args.totalItems;
    if (args.progressPercentage !== undefined) updates.progressPercentage = args.progressPercentage;
    
    await ctx.db.patch(args.jobId, updates);
  },
});

export const getJobProgress = query({
  args: { jobId: v.id("syncJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    
    return {
      status: job.status,
      currentPhase: job.currentPhase,
      totalSteps: job.totalSteps,
      completedSteps: job.completedSteps,
      currentStep: job.currentStep,
      itemsProcessed: job.itemsProcessed,
      totalItems: job.totalItems,
      progressPercentage: job.progressPercentage,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
    };
  },
});
