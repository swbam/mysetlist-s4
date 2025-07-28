import { db } from "@repo/database";
import { setlistSongs, setlists, songs, users, votes } from "@repo/database";
import { and, desc, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showId = searchParams.get("showId");
    const setlistId = searchParams.get("setlistId");

    if (!showId) {
      return NextResponse.json(
        { error: "Missing showId parameter" },
        { status: 400 },
      );
    }

    // Build conditions for setlist songs query
    const conditions = [eq(setlists.showId, showId)];

    if (setlistId) {
      conditions.push(eq(setlistSongs.setlistId, setlistId));
    }

    // Get all setlist songs for this show (optionally filtered by setlist)
    const setlistSongsQuery = db
      .select({
        id: setlistSongs.id,
        setlistId: setlistSongs.setlistId,
        songId: setlistSongs.songId,
        upvotes: setlistSongs.upvotes,
        downvotes: setlistSongs.downvotes,
        netVotes: setlistSongs.netVotes,
        song: {
          title: songs.title,
          artist: songs.artist,
        },
      })
      .from(setlistSongs)
      .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
      .innerJoin(songs, eq(setlistSongs.songId, songs.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    const setlistSongsData = await setlistSongsQuery;

    if (setlistSongsData.length === 0) {
      return NextResponse.json({
        totalVotes: 0,
        totalUpvotes: 0,
        totalDownvotes: 0,
        uniqueVoters: 0,
        averageNetVotes: 0,
        topSongs: [],
        recentActivity: [],
        votingTrends: {
          lastHour: 0,
        },
      });
    }

    const setlistSongIds = setlistSongsData.map((s) => s.id);

    // Get all votes for these songs
    const allVotes = await db
      .select({
        id: votes.id,
        userId: votes.userId,
        setlistSongId: votes.setlistSongId,
        voteType: votes.voteType,
        createdAt: votes.createdAt,
        updatedAt: votes.updatedAt,
        user: {
          displayName: users.displayName,
        },
      })
      .from(votes)
      .leftJoin(users, eq(votes.userId, users.id))
      .where(sql`${votes.setlistSongId} = ANY(${setlistSongIds})`)
      .orderBy(desc(votes.createdAt));

    // Calculate statistics
    const totalVotes = allVotes.length;
    const totalUpvotes = allVotes.filter((v) => v.voteType === "up").length;
    const totalDownvotes = allVotes.filter((v) => v.voteType === "down").length;
    const uniqueVoters = new Set(allVotes.map((v) => v.userId)).size;

    // Calculate average net votes
    const averageNetVotes =
      setlistSongsData.length > 0
        ? setlistSongsData.reduce(
            (acc, song) => acc + (song.netVotes || 0),
            0,
          ) / setlistSongsData.length
        : 0;

    // Get top songs by net votes
    const topSongs = setlistSongsData
      .map((songData, index) => ({
        id: songData.id,
        title: songData.song.title,
        artist: songData.song.artist,
        netVotes: songData.netVotes,
        upvotes: songData.upvotes,
        downvotes: songData.downvotes,
        totalVotes: (songData.upvotes || 0) + (songData.downvotes || 0),
        rank: index + 1,
      }))
      .sort((a, b) => {
        // Primary sort: net votes (descending)
        const bNetVotes = b.netVotes || 0;
        const aNetVotes = a.netVotes || 0;
        if (bNetVotes !== aNetVotes) {
          return bNetVotes - aNetVotes;
        }
        // Secondary sort: total votes (descending)
        return b.totalVotes - a.totalVotes;
      })
      .map((song, index) => ({
        ...song,
        rank: index + 1,
      }))
      .slice(0, 10);

    // Get recent activity (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentActivity = allVotes
      .filter((vote) => vote.createdAt >= oneDayAgo)
      .slice(0, 20)
      .map((vote) => {
        const songData = setlistSongsData.find(
          (s) => s.id === vote.setlistSongId,
        );
        return {
          id: vote.id,
          songTitle: songData?.song.title || "Unknown Song",
          voteType: vote.voteType,
          timestamp: vote.createdAt.toISOString(),
          username: vote.user?.displayName || "Anonymous",
        };
      });

    // Calculate voting trends
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const votesLastHour = allVotes.filter(
      (vote) => vote.createdAt >= oneHourAgo,
    ).length;

    // Calculate peak and quiet times (simplified - based on hour of day)
    const votesByHour = new Array(24).fill(0);
    allVotes.forEach((vote) => {
      const hour = vote.createdAt.getHours();
      votesByHour[hour]++;
    });

    const peakHour = votesByHour.indexOf(Math.max(...votesByHour));
    const quietHour = votesByHour.indexOf(Math.min(...votesByHour));

    const votingTrends = {
      lastHour: votesLastHour,
      peakTime: totalVotes > 0 ? `${peakHour}:00` : undefined,
      quietTime: totalVotes > 0 ? `${quietHour}:00` : undefined,
    };

    return NextResponse.json({
      totalVotes,
      totalUpvotes,
      totalDownvotes,
      uniqueVoters,
      averageNetVotes: Math.round(averageNetVotes * 10) / 10,
      topSongs,
      recentActivity,
      votingTrends,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
