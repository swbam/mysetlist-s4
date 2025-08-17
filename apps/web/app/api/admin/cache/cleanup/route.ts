import { type NextRequest, NextResponse } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "~/lib/api/auth-helpers";
// Note: avoid importing CacheManager at build time to prevent LRU/polyfill issues

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

/**
 * Admin Cache Cleanup Endpoint
 * Performs comprehensive cache maintenance and optimization
 */
export async function POST(_request: NextRequest) {
  try {
    // Authenticate admin request
    await requireCronAuth();

    const startTime = Date.now();
    const results = {
      operationsCompleted: 0,
      memoryCleared: 0,
      redisKeysCleared: 0,
      errors: [] as string[],
    };

    // 1. Clear expired cache entries (no-op if no Redis configured)
    // Disabled during build to avoid LRU runtime
    // const clearedKeys = await CacheManager.clearExpired();
    // results.redisKeysCleared += clearedKeys;
    // results.operationsCompleted++;

    // 2. Clear memory cache (safe)
    try {
      const { CacheManager } = await import("~/lib/services/cache-manager");
      const memoryCleared = CacheManager.clearMemoryCache();
      results.memoryCleared = memoryCleared;
      results.operationsCompleted++;
    } catch (error) {
      results.errors.push(`Memory cleanup failed: ${error}`);
    }

    // 3. Optimize cache patterns (disabled)

    // 4. Clear stale artist caches (> 24 hours)
    try {
      const { CacheManager } = await import("~/lib/services/cache-manager");
      const staleKeys = await CacheManager.clearStalePatterns([
        'artist:*',
        'trending:*',
        'shows:*'
      ], 24 * 60 * 60 * 1000); // 24 hours
      results.redisKeysCleared += staleKeys;
      results.operationsCompleted++;
    } catch (error) {
      results.errors.push(`Stale cache cleanup failed: ${error}`);
    }

    const processingTime = Date.now() - startTime;

    return createSuccessResponse({
      message: "Cache cleanup completed",
      results,
      processingTime,
      status: results.errors.length === 0 ? "success" : "partial_success",
    });

  } catch (error) {
    console.error("Cache cleanup error:", error);
    return createErrorResponse(
      "Cache cleanup failed",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

// Support GET for manual triggers
export async function GET(request: NextRequest) {
  return POST(request);
}