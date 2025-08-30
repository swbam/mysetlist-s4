import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";

// Create Convex client for server-side API calls
export function createConvexClient() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

// Server-side auth helper using Clerk
export async function getServerAuth() {
  const { userId } = await auth();
  return { userId, isAuthenticated: !!userId };
}

// For API routes that need user context (auth required)
export async function requireServerAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Authentication required");
  }
  return { userId };
}

// Compatibility exports for gradual migration
export const createClient = createConvexClient;
export const createAuthenticatedClient = createConvexClient;
export const createServiceClient = createConvexClient;
