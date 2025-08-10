import { format, subDays } from "date-fns";
import { type NextRequest, NextResponse } from "next/server";
import { createAuthenticatedClient } from "~/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthenticatedClient();
    const { searchParams } = new URL(request.url);

    // Check admin authorization
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !userData ||
      (userData.role !== "admin" && userData.role !== "moderator")
    ) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const period = searchParams.get("period") || "7d";
    const showId = searchParams.get("showId");
    const artistId = searchParams.get("artistId");
    const venueId = searchParams.get("venueId");

    // Calculate date range
    let startDate: Date;
    switch (period) {
      case "1d":
        startDate = subDays(new Date(), 1);
        break;
      case "30d":
        startDate = subDays(new Date(), 30);
        break;
      case "all":
        startDate = new Date("2020-01-01");
        break;
      default: // 7d
        startDate = subDays(new Date(), 7);
    }

    // Build base query
    let baseQuery = supabase
      .from("vote_analytics")
      .select(
        `
        *,
        setlist_song:setlists(
          id,
          song:songs(title, artist)
        ),
        user:users(id, display_name, username)
      `,
      )
      .gte("created_at", startDate.toISOString());

    // Apply filters
    if (showId) {
      baseQuery = baseQuery.eq("show_id", showId);
    }
    if (artistId) {
      baseQuery = baseQuery.eq("artist_id", artistId);
    }
    if (venueId) {
      baseQuery = baseQuery.eq("venue_id", venueId);
    }

    const { data: voteData, error } = await baseQuery.order("created_at", {
      ascending: false,
    });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch vote analytics" },
        { status: 500 },
      );
    }

    // Calculate summary statistics
    const summary = {
      totalVotes: voteData?.length || 0,
      upvotes: voteData?.filter((v) => v.vote_type === "up").length || 0,
      downvotes: voteData?.filter((v) => v.vote_type === "down").length || 0,
      uniqueUsers: new Set(voteData?.map((v) => v.user_id)).size,
      uniqueShows: new Set(voteData?.map((v) => v.show_id)).size,
      uniqueSongs: new Set(voteData?.map((v) => v.setlist_song_id)).size,
    };

    // Get top voted songs
    const songVotes = new Map();
    voteData?.forEach((vote) => {
      const songId = vote.setlist_song_id;
      if (!songVotes.has(songId)) {
        songVotes.set(songId, {
          song: vote.setlist_song,
          votes: 0,
          upvotes: 0,
          downvotes: 0,
        });
      }
      const songData = songVotes.get(songId);
      if (vote.vote_type === "up") {
        songData.votes += 1;
        songData.upvotes += 1;
      } else {
        songData.votes -= 1;
        songData.downvotes += 1;
      }
    });

    const topSongs = Array.from(songVotes.values())
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 10);

    // Get most active users
    const userVotes = new Map();
    voteData?.forEach((vote) => {
      const userId = vote.user_id;
      if (!userVotes.has(userId)) {
        userVotes.set(userId, {
          user: vote.user,
          votes: 0,
        });
      }
      userVotes.get(userId).votes += 1;
    });

    const topUsers = Array.from(userVotes.values())
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 10);

    // Get recent activity (last 20 votes)
    const recentActivity = voteData?.slice(0, 20) || [];

    // Get vote trends by day
    const dailyVotes = new Map();
    const dayCount = period === "1d" ? 24 : period === "30d" ? 30 : 7;

    for (let i = 0; i < dayCount; i++) {
      const date = subDays(new Date(), i);
      const dateKey =
        period === "1d" ? format(date, "HH:00") : format(date, "MMM dd");
      dailyVotes.set(dateKey, {
        date: dateKey,
        votes: 0,
        upvotes: 0,
        downvotes: 0,
      });
    }

    voteData?.forEach((vote) => {
      const voteDate = new Date(vote.created_at);
      const dateKey =
        period === "1d"
          ? format(voteDate, "HH:00")
          : format(voteDate, "MMM dd");

      if (dailyVotes.has(dateKey)) {
        const dayData = dailyVotes.get(dateKey);
        dayData.votes += 1;
        if (vote.vote_type === "up") {
          dayData.upvotes += 1;
        } else {
          dayData.downvotes += 1;
        }
      }
    });

    const trends = Array.from(dailyVotes.values()).reverse();

    // Get engagement metrics
    const engagementMetrics = {
      avgVotesPerUser:
        summary.uniqueUsers > 0
          ? (summary.totalVotes / summary.uniqueUsers).toFixed(2)
          : 0,
      avgVotesPerSong:
        summary.uniqueSongs > 0
          ? (summary.totalVotes / summary.uniqueSongs).toFixed(2)
          : 0,
      upvoteRatio:
        summary.totalVotes > 0
          ? ((summary.upvotes / summary.totalVotes) * 100).toFixed(1)
          : 0,
      votingVelocity:
        period === "1d"
          ? summary.totalVotes
          : (summary.totalVotes / Number.parseInt(period)).toFixed(1),
    };

    const analytics = {
      summary,
      topSongs,
      topUsers,
      recentActivity,
      trends,
      engagementMetrics,
      period,
      filters: {
        showId,
        artistId,
        venueId,
      },
    };

    return NextResponse.json(analytics);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch vote analytics" },
      { status: 500 },
    );
  }
}
