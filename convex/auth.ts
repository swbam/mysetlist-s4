import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Helper function to get authenticated user ID from app users table
export const getAuthUserId = async (ctx: QueryCtx | MutationCtx): Promise<Id<"users"> | null> => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  
  // Find the corresponding app user by auth ID (Clerk subject)
  const appUser = await ctx.db
    .query("users")
    .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
    .first();
  
  return appUser?._id || null;
};

export async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export const loggedInUser = query({
  args: {},
  returns: v.union(
    v.object({
      identity: v.any(), // Clerk identity object
      appUser: v.optional(v.any()) // User document
    }),
    v.null()
  ),
  handler: async (ctx: QueryCtx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    
    // Check if app user exists
    const appUser = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();
    
    return {
      identity,
      appUser
    };
  },
});

export const createAppUser = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx: MutationCtx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be logged in");
    }
    
    // Check if app user already exists
    const existingAppUser = await ctx.db
      .query("users")
      .withIndex("by_auth_id", (q) => q.eq("authId", identity.subject))
      .first();
    
    if (existingAppUser) {
      return existingAppUser._id;
    }
    
    // Generate unique username from name/email
    const baseUsername = (identity.name || identity.email || "user").toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
    
    let username = baseUsername;
    let counter = 1;
    
    // Ensure username is unique
    while (true) {
      const existingUsername = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", username))
        .first();
      
      if (!existingUsername) break;
      username = `${baseUsername}${counter}`;
      counter++;
    }
    
    // Create app user with Clerk data
    return await ctx.db.insert("users", {
      authId: identity.subject,
      email: identity.email,
      name: identity.name,
      username,
      role: "user",
      preferences: {
        emailNotifications: true,
        favoriteGenres: [],
      },
      createdAt: Date.now(),
    });
  },
});