// Convex database utilities
export { convex } from "./convex";

// For API routes that need server-side Convex calls
import { ConvexHttpClient } from "convex/browser";

export function createConvexClient() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}
