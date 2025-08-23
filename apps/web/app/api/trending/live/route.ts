import { db, userActivityLog } from "@repo/database";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { type TrendingItem, getTrendingContent } from "~/lib/trending";
import { rateLimitMiddleware } from "~/middleware/rate-limit";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

// Schema for live trending validation
const liveQuerySchema = z.object({
  type: z.enum(["all", "artists", "shows"]).optional().default("all"),
  limit: z.number().min(1).max(100).optional().default(20),
  since: z.string().optional(), // ISO timestamp for incremental updates
  include_metadata: z.boolean().optional().default(false),
});

interface LiveUpdate {
  id: string;
  type: "artist" | "show";
  action: "new" | "update" | "rank_change";
  current_rank: number;
  previous_rank?: number;
  score_change?: number;
  timestamp: string;
  data: TrendingItem;
}

interface LiveTrendingResponse {
  timestamp: string;
  type: string;
  live_updates: LiveUpdate[];
  current_trending: TrendingItem[];
  stats: {
    total_items: number;
    updates_since_last: number;
    next_update_eta: string;
  };
}

export async function GET(request: NextRequest) {
  // Apply rate limiting - more frequent for live updates
  const rateLimitResult = await rateLimitMiddleware(request, {
    maxRequests: 120,
    windowSeconds: 60, // Allow more requests for live updates
  });
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "all";
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const since = searchParams.get("since");
    const includeMetadata = searchParams.get("include_metadata") === "true";

    // Validate parameters
    const validation = liveQuerySchema.safeParse({
      type,
      limit,
      since,
      include_metadata: includeMetadata,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const {
      type: queryType,
      limit: queryLimit,
      since: sinceParam,
    } = validation.data;

    const currentTime = new Date().toISOString();

    // Get current trending data
    const trendingData = await getTrendingContent({
      timeWindow: 24, // Live trending focuses on last 24 hours
      weightVotes: 2.0,
      weightAttendees: 1.5,
      weightRecency: 2.5, // Higher recency weight for live updates
      limit: queryLimit,
    });

    let currentTrending: TrendingItem[] = [];

    switch (queryType) {
      case "artists":
        currentTrending = trendingData.artists;
        break;
      case "shows":
        currentTrending = trendingData.shows;
        break;
      default:
        currentTrending = trendingData.combined;
        break;
    }

    // Get live updates since the specified timestamp
    const liveUpdates: LiveUpdate[] = [];

    if (sinceParam) {
      try {
        const sinceDate = new Date(sinceParam);

        // Query recent activity from database for incremental updates
        try {
          const recentActivity = await db
            .select({
              id: userActivityLog.id,
              userId: userActivityLog.userId,
              action: userActivityLog.action,
              targetType: userActivityLog.targetType,
              targetId: userActivityLog.targetId,
              createdAt: userActivityLog.createdAt,
              details: userActivityLog.details,
            })
            .from(userActivityLog)
            .where(
              and(
                gte(userActivityLog.createdAt, new Date(sinceDate)),
                inArray(userActivityLog.action, [
                  "vote",
                  "attend",
                  "follow",
                  "view",
                ]),
                inArray(userActivityLog.targetType, ["show", "artist"]),
              ),
            )
            .orderBy(desc(userActivityLog.createdAt))
            .limit(50);

          if (recentActivity.length > 0) {
            // Process activity into trending updates
            const activityMap = new Map<string, any>();

            recentActivity.forEach((activity) => {
              const key = `${activity.targetType}_${activity.targetId}`;
              if (!activityMap.has(key)) {
                activityMap.set(key, {
                  entity_type: activity.targetType,
                  entity_id: activity.targetId,
                  activities: [],
                  latest_timestamp: activity.createdAt,
                });
              }
              activityMap.get(key).activities.push(activity);
            });

            // Convert activity to live updates
            for (const [_, activityData] of activityMap) {
              const item = currentTrending.find(
                (item) => item.id === activityData.entity_id,
              );
              if (item) {
                liveUpdates.push({
                  id: item.id,
                  type: item.type,
                  action: "update",
                  current_rank: currentTrending.indexOf(item) + 1,
                  timestamp: activityData.latest_timestamp,
                  data: item,
                });
              }
            }
          }
        } catch (activityError) {
          console.warn("Error querying recent activity:", activityError);
        }
      } catch (error) {
        console.warn("Error processing since parameter:", error);
        // Continue without incremental updates
      }
    }

    // Get trending changes by comparing with previous rankings
    if (sinceParam) {
      try {
        // For MVP, we'll skip trending snapshots as it requires additional schema
        // This feature can be added later when needed
        const previousData: TrendingItem[] = [];

        if (previousData.length > 0) {
          // Compare rankings
          currentTrending.forEach((currentItem, currentIndex) => {
            const previousIndex = previousData.findIndex(
              (prev) => prev.id === currentItem.id,
            );

            if (previousIndex === -1) {
              // New trending item
              liveUpdates.push({
                id: currentItem.id,
                type: currentItem.type,
                action: "new",
                current_rank: currentIndex + 1,
                timestamp: currentTime,
                data: currentItem,
              });
            } else if (previousIndex !== currentIndex) {
              // Rank change
              const previousItem = previousData[previousIndex];
              liveUpdates.push({
                id: currentItem.id,
                type: currentItem.type,
                action: "rank_change",
                current_rank: currentIndex + 1,
                previous_rank: previousIndex + 1,
                score_change: currentItem.score - (previousItem?.score || 0),
                timestamp: currentTime,
                data: currentItem,
              });
            }
          });
        }
      } catch (error) {
        console.warn("Error processing trending snapshots:", error);
        // Continue without rank change detection
      }
    }

    // Note: Trending snapshots feature skipped for MVP
    // Can be implemented later with proper schema

    // Calculate next update ETA (trending updates every 5 minutes)
    const nextUpdate = new Date(Date.now() + 5 * 60 * 1000);

    const response: LiveTrendingResponse = {
      timestamp: currentTime,
      type: queryType,
      live_updates: liveUpdates,
      current_trending: currentTrending,
      stats: {
        total_items: currentTrending.length,
        updates_since_last: liveUpdates.length,
        next_update_eta: nextUpdate.toISOString(),
      },
    };

    // Add metadata if requested
    if (includeMetadata) {
      (response as any).metadata = {
        cache_strategy: "no-cache",
        update_frequency: "5 minutes",
        data_sources: ["votes", "attendance", "follows", "views"],
        ranking_algorithm: "weighted_score_with_recency",
      };
    }

    const jsonResponse = NextResponse.json(response);

    // No caching for live updates
    jsonResponse.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate",
    );
    jsonResponse.headers.set("Pragma", "no-cache");
    jsonResponse.headers.set("Expires", "0");

    // Add Server-Sent Events headers for streaming support
    jsonResponse.headers.set("X-Accel-Buffering", "no");
    jsonResponse.headers.set("Connection", "keep-alive");

    return jsonResponse;
  } catch (error) {
    console.error("Live trending error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch live trending data",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * POST endpoint for real-time trending updates via webhooks
 * Used by internal systems to push live updates
 */
export async function POST(request: NextRequest) {
  // Stricter rate limiting for POST requests
  const rateLimitResult = await rateLimitMiddleware(request, {
    maxRequests: 30,
    windowSeconds: 60,
  });
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    // Verify internal webhook token
    const authHeader = request.headers.get("authorization");
    const webhookSecret = process.env['TRENDING_WEBHOOK_SECRET'];

    if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized webhook request" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { type, entity_id, action, metadata } = body;

    // Log the activity that triggered the update
    await db.insert(userActivityLog).values({
      userId: metadata?.user_id || null,
      action: action,
      targetType: type,
      targetId: entity_id,
      details: JSON.stringify(metadata),
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Live trending update processed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Live trending webhook error:", error);
    return NextResponse.json(
      {
        error: "Failed to process trending update",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  );
}
