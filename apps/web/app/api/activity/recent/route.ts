import {
  artists,
  db,
  setlists,
  shows,
  songs,
  userActivityLog,
  users,
  venues,
} from "@repo/database";
import { and, desc, eq, gte } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitMiddleware } from "~/middleware/rate-limit";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

// Schema for activity feed validation
const activityQuerySchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
  user_id: z.string().uuid().optional(),
  type: z
    .enum(["all", "votes", "follows", "reviews", "shows", "setlists"])
    .optional()
    .default("all"),
  since: z.string().optional(), // ISO timestamp
  include_user_details: z.boolean().optional().default(true),
});

interface ActivityItem {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  user_id?: string;
  user?: {
    id: string;
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
  target_details?: {
    name: string;
    slug?: string;
    image_url?: string;
    artist_name?: string;
    venue_name?: string;
    date?: string;
  };
  timestamp: string;
  metadata?: any;
}

interface RecentActivityResponse {
  activities: ActivityItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  timestamp: string;
  filters_applied: {
    type: string;
    user_id?: string;
    since?: string;
  };
}

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimitMiddleware(request, {
    maxRequests: 60,
    windowSeconds: 60,
  });
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const userId = searchParams.get("user_id") || undefined;
    const type = searchParams.get("type") || "all";
    const since = searchParams.get("since") || undefined;
    const includeUserDetails =
      searchParams.get("include_user_details") !== "false";

    // Validate parameters
    const validation = activityQuerySchema.safeParse({
      limit,
      offset,
      user_id: userId,
      type,
      since,
      include_user_details: includeUserDetails,
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
      limit: queryLimit,
      offset: queryOffset,
      user_id,
      type: activityType,
      since: sinceParam,
    } = validation.data;

    // Build filter conditions
    const conditions: any[] = [];

    if (user_id) {
      conditions.push(eq(userActivityLog.userId, user_id));
    }

    if (sinceParam) {
      try {
        const sinceDate = new Date(sinceParam);
        conditions.push(gte(userActivityLog.createdAt, new Date(sinceDate)));
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid since timestamp format" },
          { status: 400 },
        );
      }
    }

    // Filter by activity type
    if (activityType !== "all") {
      switch (activityType) {
        case "votes":
          conditions.push(eq(userActivityLog.action, "vote"));
          break;
        case "follows":
          conditions.push(eq(userActivityLog.action, "follow"));
          break;
        case "reviews":
          conditions.push(eq(userActivityLog.action, "review"));
          break;
        case "shows":
          conditions.push(eq(userActivityLog.targetType, "show"));
          break;
        case "setlists":
          conditions.push(eq(userActivityLog.targetType, "setlist"));
          break;
      }
    }

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined;

    // Execute query with pagination
    const query = db
      .select({
        id: userActivityLog.id,
        userId: userActivityLog.userId,
        action: userActivityLog.action,
        targetType: userActivityLog.targetType,
        targetId: userActivityLog.targetId,
        details: userActivityLog.details,
        createdAt: userActivityLog.createdAt,
        ...(includeUserDetails
          ? {
              user: {
                id: users.id,
                displayName: users.displayName,
              },
            }
          : {}),
      })
      .from(userActivityLog)
      .orderBy(desc(userActivityLog.createdAt))
      .limit(queryLimit)
      .offset(queryOffset);

    if (includeUserDetails) {
      query.leftJoin(users, eq(userActivityLog.userId, users.id));
    }

    if (whereCondition) {
      query.where(whereCondition);
    }

    const activities = await query;

    // Get count for pagination
    const countQuery = db
      .select({ count: userActivityLog.id })
      .from(userActivityLog);

    if (whereCondition) {
      countQuery.where(whereCondition);
    }

    const countResult = await countQuery;
    const count = countResult.length;

    if (!activities) {
      return NextResponse.json({
        activities: [],
        pagination: {
          total: 0,
          limit: queryLimit,
          offset: queryOffset,
          has_more: false,
        },
        timestamp: new Date().toISOString(),
        filters_applied: { type: activityType, user_id, since: sinceParam },
      });
    }

    // Enrich activities with target details
    const enrichedActivities: ActivityItem[] = await Promise.all(
      activities.map(async (activity: any) => {
        const baseActivity: ActivityItem = {
          id: activity.id,
          action: activity.action,
          target_type: activity.targetType,
          target_id: activity.targetId,
          user_id: activity.userId,
          timestamp: activity.createdAt,
          metadata: activity.details,
        };

        // Add user details if available and requested
        if (includeUserDetails && activity.user) {
          baseActivity.user = {
            id: activity.user.id,
            display_name: activity.user.displayName,
          };
        }

        // Fetch target details based on target type
        try {
          switch (activity.targetType) {
            case "artist": {
              const artistData = await db
                .select({
                  name: artists.name,
                  slug: artists.slug,
                  imageUrl: artists.imageUrl,
                })
                .from(artists)
                .where(eq(artists.id, activity.targetId))
                .limit(1);

              if (artistData[0]) {
                const artist = artistData[0];
                baseActivity.target_details = {
                  name: artist.name,
                  slug: artist.slug ?? undefined,
                  image_url: artist.imageUrl ?? undefined,
                } as { name: string; slug?: string; image_url?: string };
              }
              break;
            }

            case "show": {
              const showData = await db
                .select({
                  name: shows.name,
                  slug: shows.slug,
                  date: shows.date,
                  artistName: artists.name,
                  venueName: venues.name,
                  venueCity: venues.city,
                })
                .from(shows)
                .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
                .leftJoin(venues, eq(shows.venueId, venues.id))
                .where(eq(shows.id, activity.targetId))
                .limit(1);

              if (showData[0]) {
                const show = showData[0];
                baseActivity.target_details = {
                  name: show.name || `${show.artistName} at ${show.venueName}`,
                  slug: show.slug ?? undefined,
                  date: show.date ?? undefined,
                  artist_name: show.artistName ?? undefined,
                  venue_name: show.venueName
                    ? `${show.venueName}, ${show.venueCity}`
                    : undefined,
                } as { name: string; slug?: string; date?: string; artist_name?: string; venue_name?: string };
              }
              break;
            }

            case "venue": {
              const venueData = await db
                .select({
                  name: venues.name,
                  slug: venues.slug,
                  city: venues.city,
                  state: venues.state,
                })
                .from(venues)
                .where(eq(venues.id, activity.targetId))
                .limit(1);

              if (venueData[0]) {
                const venue = venueData[0];
                baseActivity.target_details = {
                  name: venue.name,
                  slug: venue.slug ?? undefined,
                  venue_name: `${venue.city}, ${venue.state}`,
                } as { name: string; slug?: string; venue_name?: string };
              }
              break;
            }

            case "setlist": {
              const setlistData = await db
                .select({
                  showSlug: shows.slug,
                  showDate: shows.date,
                  artistName: artists.name,
                  artistImageUrl: artists.imageUrl,
                  venueName: venues.name,
                })
                .from(setlists)
                .leftJoin(shows, eq(setlists.showId, shows.id))
                .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
                .leftJoin(venues, eq(shows.venueId, venues.id))
                .where(eq(setlists.id, activity.targetId))
                .limit(1);

              if (setlistData[0]) {
                const setlist = setlistData[0];
                baseActivity.target_details = {
                  name: `${setlist.artistName} setlist`,
                  slug: setlist.showSlug ?? undefined,
                  date: setlist.showDate ?? undefined,
                  artist_name: setlist.artistName ?? undefined,
                  venue_name: setlist.venueName ?? undefined,
                  image_url: setlist.artistImageUrl ?? undefined,
                } as { name: string; slug?: string; date?: string; artist_name?: string; venue_name?: string; image_url?: string };
              }
              break;
            }

            case "song": {
              const songData = await db
                .select({
                  songTitle: songs.name,
                  artistName: songs.artist,
                })
                .from(songs)
                .where(eq(songs.id, activity.targetId))
                .limit(1);

              if (songData[0]) {
                const song = songData[0];
                baseActivity.target_details = {
                  name: song.songTitle,
                  artist_name: song.artistName ?? undefined,
                } as { name: string; artist_name?: string };
              }
              break;
            }

            default:
              // Generic target details from metadata
              if (activity.details) {
                const details =
                  typeof activity.details === "string"
                    ? JSON.parse(activity.details)
                    : activity.details;

                baseActivity.target_details = {
                  name: details.name || details.title || "Unknown",
                  ...details,
                };
              }
              break;
          }
        } catch (error) {
          console.warn(
            `Failed to fetch details for ${activity.targetType} ${activity.targetId}:`,
            error,
          );
          // Continue without target details
        }

        return baseActivity;
      }),
    );

    const response: RecentActivityResponse = {
      activities: enrichedActivities,
      pagination: {
        total: count || 0,
        limit: queryLimit,
        offset: queryOffset,
        has_more: (count || 0) > queryOffset + queryLimit,
      },
      timestamp: new Date().toISOString(),
      filters_applied: {
        type: activityType,
        user_id: user_id ?? undefined,
        since: sinceParam ?? undefined,
      } as { type: string; user_id?: string; since?: string },
    };

    const jsonResponse = NextResponse.json(response);

    // Add caching headers - cache for 1 minute since activity changes frequently
    jsonResponse.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=120",
    );

    return jsonResponse;
  } catch (error) {
    console.error("Recent activity error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch recent activity",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * POST endpoint for logging new activity
 * Used internally by the app to track user actions
 */
export async function POST(request: NextRequest) {
  // Apply stricter rate limiting for POST requests
  const rateLimitResult = await rateLimitMiddleware(request, {
    maxRequests: 100,
    windowSeconds: 60,
  });
  if (rateLimitResult) {
    return rateLimitResult;
  }

  try {
    const body = await request.json();
    const { user_id, action, target_type, target_id, details } = body;

    // Validate required fields
    if (!action || !target_type || !target_id) {
      return NextResponse.json(
        { error: "Missing required fields: action, target_type, target_id" },
        { status: 400 },
      );
    }

    // Log the activity
    const activity = await db
      .insert(userActivityLog)
      .values({
        userId: user_id || null,
        action,
        targetType: target_type,
        targetId: target_id,
        details: details ? JSON.stringify(details) : null,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0] ||
          request.headers.get("x-real-ip") ||
          null,
        userAgent: request.headers.get("user-agent") || null,
        createdAt: new Date(),
      })
      .returning({
        id: userActivityLog.id,
        createdAt: userActivityLog.createdAt,
      });

    return NextResponse.json({
      success: true,
      activity_id: activity[0]?.id,
      timestamp: activity[0]?.createdAt,
      message: "Activity logged successfully",
    });
  } catch (error) {
    console.error("Activity logging error:", error);
    return NextResponse.json(
      {
        error: "Failed to log activity",
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
