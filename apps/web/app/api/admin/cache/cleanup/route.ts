// NextRequest not used since POST() takes no parameters
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "~/lib/api/auth-helpers";
import { CacheManager } from "~/lib/services/cache-manager";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

/**
 * Admin Cache Cleanup Endpoint
 * Performs comprehensive cache maintenance and optimization
 */
export async function POST() {
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

    // 1. Clear expired cache entries
    try {
      const clearedKeys = await CacheManager.clearExpired();
      results.redisKeysCleared += clearedKeys;
      results.operationsCompleted++;
    } catch (error) {
      results.errors.push(`Redis cleanup failed: ${error}`);
    }

    // 2. Clear memory cache
    try {
      const memoryCleared = CacheManager.clearMemoryCache();
      results.memoryCleared = memoryCleared;
      results.operationsCompleted++;
    } catch (error) {
      results.errors.push(`Memory cleanup failed: ${error}`);
    }

    // 3. Optimize cache patterns
    try {
      await CacheManager.optimizeCachePatterns();
      results.operationsCompleted++;
    } catch (error) {
      results.errors.push(`Cache optimization failed: ${error}`);
    }

    // 4. Clear stale artist caches (> 24 hours)
    try {
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
export async function GET() {
  return POST();
}