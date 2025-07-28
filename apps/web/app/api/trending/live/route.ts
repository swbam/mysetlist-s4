import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "~/lib/supabase/server";
import {
  calculateArtistGrowth,
  calculateShowGrowth,
  calculateVenueGrowth,
} from "@repo/database";

interface LiveTrendingItem {
  id: string;
  type: "artist" | "show" | "venue";
  name: string;
  slug: string;
  imageUrl?: string;
  score: number;
  metrics: {
    searches: number;
    views: number;
    interactions: number;
    growth: number;
  };
  timeframe: "1h" | "6h" | "24h";
}

// Add ISR support with cache headers
export const revalidate = 60; // Revalidate every minute for live data

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const timeframe =
    (searchParams.get("timeframe") as "1h" | "6h" | "24h") || "24h";
  const limit = Number.parseInt(searchParams.get("limit") || "10");
  const type = searchParams.get("type") as "artist" | "show" | "venue" | "all";

  try {
    const supabase = await createServiceClient();
    const trending: LiveTrendingItem[] = [];

    // Calculate time window for trending based on timeframe
    const now = new Date();
    const timeWindow = new Date();
    switch (timeframe) {
      case "1h":
        timeWindow.setHours(now.getHours() - 1);
        break;
      case "6h":
        timeWindow.setHours(now.getHours() - 6);
        break;
      case "24h":
      default:
        timeWindow.setDate(now.getDate() - 1);
        break;
    }

    // -----------------------------
    // Artists
    // -----------------------------
    if (type === "all" || type === "artist") {
      try {
        const { data: trendingArtists } = await supabase
          .from("artists")
          .select(
            "id, name, slug, image_url, popularity, followers, follower_count, monthly_listeners, trending_score, updated_at, previous_followers, previous_popularity, previous_follower_count, previous_monthly_listeners",
          )
          .or("trending_score.gt.0,popularity.gt.0,followers.gt.0")
          .order("trending_score", { ascending: false })
          .order("popularity", { ascending: false })
          .limit(type === "artist" ? limit : Math.ceil(limit / 3));

        if (trendingArtists && trendingArtists.length > 0) {
          trendingArtists.forEach((artist) => {
            // Calculate metrics based on available data
            const searches = Math.round((artist.popularity || 0) * 1.5);
            const views = artist.popularity || 0;
            const interactions = artist.follower_count || artist.followers || 0;
            const trendingScore = artist.trending_score || 0;

            // Calculate real growth using historical data (no fake calculations)
            const realGrowth = calculateArtistGrowth({
              followers: artist.followers || 0,
              previousFollowers: artist.previous_followers,
              popularity: artist.popularity || 0,
              previousPopularity: artist.previous_popularity,
              monthlyListeners: artist.monthly_listeners,
              previousMonthlyListeners: artist.previous_monthly_listeners,
              followerCount: artist.follower_count || 0,
              previousFollowerCount: artist.previous_follower_count,
            });

            // Use real growth data only (0 if no historical data available)
            const growth = realGrowth.overallGrowth;

            // Calculate comprehensive score
            const score =
              trendingScore + searches * 2 + views * 1.5 + interactions * 3;

            trending.push({
              id: artist.id,
              type: "artist",
              name: artist.name,
              slug: artist.slug,
              ...(artist.image_url && { imageUrl: artist.image_url }),
              score: Math.round(score),
              metrics: {
                searches,
                views,
                interactions,
                growth: Math.round(growth * 10) / 10,
              },
              timeframe,
            });
          });
        }
      } catch (err) {
        console.error("Error fetching trending artists:", err);
        // Continue with other data types
      }
    }

    // -----------------------------
    // Shows
    // -----------------------------
    if (type === "all" || type === "show") {
      try {
        const { data: trendingShows } = await supabase
          .from("shows")
          .select(
            `
            id,
            name,
            slug,
            view_count,
            vote_count,
            attendee_count,
            setlist_count,
            trending_score,
            updated_at,
            date,
            previous_view_count,
            previous_attendee_count,
            previous_vote_count,
            previous_setlist_count,
            headliner_artist:artists!shows_headliner_artist_id_fkey(
              name,
              image_url
            )
          `,
          )
          .or(
            "date.gte." +
              new Date().toISOString().split("T")[0] +
              ",attendee_count.gt.0",
          )
          .order("trending_score", { ascending: false })
          .order("attendee_count", { ascending: false })
          .limit(type === "show" ? limit : Math.ceil(limit / 3));

        if (trendingShows && trendingShows.length > 0) {
          trendingShows.forEach((show) => {
            const searches = Math.round((show.view_count || 0) * 0.3);
            const views = show.view_count || 0;
            const interactions =
              (show.vote_count || 0) + (show.attendee_count || 0);
            const trendingScore = show.trending_score || 0;

            // Calculate real growth using historical data (no fake calculations)
            const realGrowth = calculateShowGrowth({
              viewCount: show.view_count || 0,
              previousViewCount: show.previous_view_count,
              attendeeCount: show.attendee_count || 0,
              previousAttendeeCount: show.previous_attendee_count,
              voteCount: show.vote_count || 0,
              previousVoteCount: show.previous_vote_count,
              setlistCount: show.setlist_count || 0,
              previousSetlistCount: show.previous_setlist_count,
            });

            // Use real growth data only (0 if no historical data available)
            const growth = realGrowth.overallGrowth;

            // Calculate comprehensive score
            const score =
              trendingScore + searches * 2 + views * 1.5 + interactions * 3;

            const artistName =
              show.headliner_artist?.[0]?.name || show.name || "Unnamed Show";
            const artistImage = show.headliner_artist?.[0]?.image_url;

            trending.push({
              id: show.id,
              type: "show",
              name: artistName,
              slug: show.slug,
              ...(artistImage && { imageUrl: artistImage }),
              score: Math.round(score),
              metrics: {
                searches,
                views,
                interactions,
                growth: Math.round(growth * 10) / 10,
              },
              timeframe,
            });
          });
        }
      } catch (err) {
        console.error("Error fetching trending shows:", err);
      }
    }

    // -----------------------------
    // Venues
    // -----------------------------
    if (type === "all" || type === "venue") {
      try {
        // Get venues with real analytics and historical data
        const { data: trendingVenues } = await supabase
          .from("venues")
          .select(
            `
            id,
            name,
            slug,
            image_url,
            capacity,
            city,
            state,
            total_shows,
            upcoming_shows,
            total_attendance,
            previous_total_shows,
            previous_upcoming_shows,
            previous_total_attendance
          `,
          )
          .not("capacity", "is", null)
          .gt("capacity", 0)
          .order("total_shows", { ascending: false, nullsFirst: false })
          .order("capacity", { ascending: false })
          .limit(type === "venue" ? limit : Math.floor(limit / 3));

        if (trendingVenues && trendingVenues.length > 0) {
          trendingVenues.forEach((venue) => {
            // Use real venue data (not fake show counts)
            const totalShows = venue.total_shows || 0;
            const upcomingShows = venue.upcoming_shows || 0;
            const searches = Math.round(totalShows * 0.5);
            const views = totalShows * 2;
            const interactions = totalShows + upcomingShows;

            // Calculate real growth using historical data (no fake calculations)
            const realGrowth = calculateVenueGrowth({
              totalShows: venue.total_shows || 0,
              previousTotalShows: venue.previous_total_shows,
              upcomingShows: venue.upcoming_shows || 0,
              previousUpcomingShows: venue.previous_upcoming_shows,
              totalAttendance: venue.total_attendance || 0,
              previousTotalAttendance: venue.previous_total_attendance,
            });

            // Use real growth data only (0 if no historical data available)
            const growth = realGrowth.overallGrowth;

            // Calculate score based on activity and capacity utilization
            const score =
              searches * 2 +
              views * 1.5 +
              interactions * 3 +
              (venue.capacity || 1000) * 0.01;

            trending.push({
              id: venue.id,
              type: "venue",
              name: venue.name,
              slug: venue.slug,
              ...(venue.image_url && { imageUrl: venue.image_url }),
              score: Math.round(score),
              metrics: {
                searches,
                views,
                interactions,
                growth: Math.round(growth * 10) / 10,
              },
              timeframe,
            });
          });
        }
      } catch (err) {
        console.error("Error fetching trending venues:", err);
      }
    }

    // Sort by score and return top results
    const sortedTrending = trending
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const response = NextResponse.json({
      trending: sortedTrending,
      timeframe,
      type: type || "all",
      total: sortedTrending.length,
      generatedAt: new Date().toISOString(),
    });

    // Add cache headers for better performance
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );

    return response;
  } catch (error) {
    // Return error details for debugging
    return NextResponse.json({
      trending: [],
      timeframe,
      type: type || "all",
      total: 0,
      generatedAt: new Date().toISOString(),
      error: "Unable to fetch trending data",
      errorDetails: error instanceof Error ? error.message : String(error),
    });
  }
}
