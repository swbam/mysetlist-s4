import { db } from "@repo/database";
import { setlistSongs, setlists, votes } from "@repo/database";
import { eachHourOfInterval, format, subHours } from "date-fns";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showId = searchParams.get("showId");
    const setlistId = searchParams.get("setlistId");
    const timeframe = searchParams.get("timeframe") || "24h";

    if (!showId) {
      return NextResponse.json(
        { error: "Missing showId parameter" },
        { status: 400 },
      );
    }

    // Parse timeframe
    const hours = Number.parseInt(timeframe.replace("h", ""));
    const startTime = subHours(new Date(), hours);

    // Build conditions for setlist songs query
    const conditions = [eq(setlists.showId, showId)];

    if (setlistId) {
      conditions.push(eq(setlistSongs.setlistId, setlistId));
    }

    // Get all setlist songs for this show
    const setlistSongsQuery = db
      .select({
        id: setlistSongs.id,
        setlistId: setlistSongs.setlistId,
      })
      .from(setlistSongs)
      .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    const setlistSongsData = await setlistSongsQuery;

    if (setlistSongsData.length === 0) {
      return NextResponse.json({
        hourly: [],
        summary: {
          totalVotes: 0,
          peakHour: "00:00",
          quietHour: "00:00",
          averageVotesPerHour: 0,
          currentTrend: "stable" as const,
          momentumScore: 0,
        },
        topMoments: [],
        predictions: {
          nextHourVotes: 0,
          confidence: 0,
          factors: [],
        },
      });
    }

    const setlistSongIds = setlistSongsData.map((s) => s.id);

    // Get votes within the timeframe
    const votesData = await db
      .select({
        id: votes.id,
        voteType: votes.voteType,
        createdAt: votes.createdAt,
        setlistSongId: votes.setlistSongId,
      })
      .from(votes)
      .where(
        and(
          sql`${votes.setlistSongId} = ANY(${setlistSongIds})`,
          gte(votes.createdAt, startTime),
        ),
      )
      .orderBy(desc(votes.createdAt));

    // Generate hourly intervals
    const now = new Date();
    const hourlyIntervals = eachHourOfInterval({ start: startTime, end: now });

    // Group votes by hour
    const hourlyData = hourlyIntervals.map((intervalStart) => {
      const intervalEnd = new Date(intervalStart.getTime() + 60 * 60 * 1000);
      const hourVotes = votesData.filter(
        (vote) =>
          vote.createdAt >= intervalStart && vote.createdAt < intervalEnd,
      );

      const upvotes = hourVotes.filter((v) => v.voteType === "up").length;
      const downvotes = hourVotes.filter((v) => v.voteType === "down").length;

      return {
        hour: format(intervalStart, "HH:mm"),
        votes: hourVotes.length,
        upvotes,
        downvotes,
        timestamp: intervalStart.toISOString(),
      };
    });

    // Calculate summary statistics
    const totalVotes = votesData.length;
    const averageVotesPerHour = totalVotes / Math.max(1, hourlyData.length);

    // Find peak and quiet hours
    const maxVotes = Math.max(...hourlyData.map((h) => h.votes), 0);
    const minVotes = Math.min(...hourlyData.map((h) => h.votes), 0);
    const peakHour =
      hourlyData.find((h) => h.votes === maxVotes)?.hour || "00:00";
    const quietHour =
      hourlyData.find((h) => h.votes === minVotes)?.hour || "00:00";

    // Calculate current trend (last 3 hours vs previous 3 hours)
    const recentHours = hourlyData.slice(-3);
    const previousHours = hourlyData.slice(-6, -3);
    const recentAvg =
      recentHours.reduce((sum, h) => sum + h.votes, 0) /
      Math.max(1, recentHours.length);
    const previousAvg =
      previousHours.reduce((sum, h) => sum + h.votes, 0) /
      Math.max(1, previousHours.length);

    let currentTrend: "up" | "down" | "stable" = "stable";
    if (recentAvg > previousAvg * 1.2) {
      currentTrend = "up";
    } else if (recentAvg < previousAvg * 0.8) {
      currentTrend = "down";
    }

    // Calculate momentum score (0-1, based on consistency and growth)
    const hourlyGrowth = hourlyData
      .slice(1)
      .map((h, i) => h.votes - (hourlyData[i] || { votes: 0 }).votes);
    const positiveGrowth = hourlyGrowth.filter((g) => g > 0).length;
    const consistency = positiveGrowth / Math.max(1, hourlyGrowth.length);
    const volumeScore = Math.min(1, totalVotes / (hours * 10)); // Normalize to expected volume
    const momentumScore = consistency * 0.6 + volumeScore * 0.4;

    // Identify key moments (hours with significant activity spikes)
    const averageVotes = totalVotes / Math.max(1, hourlyData.length);
    const threshold = averageVotes * 1.5;

    const topMoments = hourlyData
      .filter((h) => h.votes > threshold)
      .map((h) => ({
        time: h.hour,
        event: `High voting activity (${h.votes} votes)`,
        votes: h.votes,
        impact:
          h.votes > averageVotes * 3
            ? ("high" as const)
            : h.votes > averageVotes * 2
              ? ("medium" as const)
              : ("low" as const),
      }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 5);

    // Simple prediction for next hour (based on recent trend and time patterns)
    const lastHourVotes = hourlyData.at(-1)?.votes || 0;
    const trendMultiplier =
      currentTrend === "up" ? 1.2 : currentTrend === "down" ? 0.8 : 1.0;
    const timeOfDay = new Date().getHours();

    // Adjust for typical activity patterns (simplified)
    let timeMultiplier = 1.0;
    if (timeOfDay >= 18 && timeOfDay <= 23) {
      timeMultiplier = 1.3; // Evening peak
    } else if (timeOfDay >= 0 && timeOfDay <= 6) {
      timeMultiplier = 0.3; // Night quiet
    } else if (timeOfDay >= 12 && timeOfDay <= 17) {
      timeMultiplier = 1.1; // Afternoon
    }

    const predictedVotes = Math.round(
      (lastHourVotes * 0.4 + averageVotes * 0.6) *
        trendMultiplier *
        timeMultiplier,
    );

    // Confidence based on data consistency and recency
    const dataPoints = hourlyData.filter((h) => h.votes > 0).length;
    const confidence = Math.min(0.95, Math.max(0.3, dataPoints / hours));

    const predictionFactors: string[] = [];
    if (currentTrend !== "stable") {
      predictionFactors.push(
        `${currentTrend === "up" ? "Upward" : "Downward"} trend detected`,
      );
    }
    if (timeOfDay >= 18 && timeOfDay <= 23) {
      predictionFactors.push("Peak evening activity period");
    }
    if (momentumScore > 0.7) {
      predictionFactors.push("High engagement momentum");
    }
    if (lastHourVotes > averageVotes * 1.5) {
      predictionFactors.push("Recent high activity");
    }

    return NextResponse.json({
      hourly: hourlyData,
      summary: {
        totalVotes,
        peakHour,
        quietHour,
        averageVotesPerHour: Math.round(averageVotesPerHour * 10) / 10,
        currentTrend,
        momentumScore: Math.round(momentumScore * 100) / 100,
      },
      topMoments,
      predictions: {
        nextHourVotes: predictedVotes,
        confidence: Math.round(confidence * 100) / 100,
        factors: predictionFactors,
      },
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
