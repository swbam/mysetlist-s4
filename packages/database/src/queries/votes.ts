import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../client";
import { setlistSongs, setlists, shows, users, votes } from "../schema";

export async function createVote(voteData: {
  userId: string;
  setlistSongId: string;
  // Downvotes deprecated: force to 'up'
  voteType?: "up";
}) {
  const [vote] = await db
    .insert(votes)
    .values({
      userId: voteData.userId,
      setlistSongId: voteData.setlistSongId,
      voteType: "up",
    })
    .onConflictDoUpdate({
      target: [votes.userId, votes.setlistSongId],
      set: {
        voteType: "up",
        updatedAt: new Date(),
      },
    })
    .returning();

  return vote;
}

export async function removeVote(userId: string, setlistSongId: string) {
  await db
    .delete(votes)
    .where(
      and(eq(votes.userId, userId), eq(votes.setlistSongId, setlistSongId)),
    );

  return { success: true };
}

export async function getUserVote(userId: string, setlistSongId: string) {
  const vote = await db
    .select()
    .from(votes)
    .where(
      and(eq(votes.userId, userId), eq(votes.setlistSongId, setlistSongId)),
    )
    .limit(1);

  return vote[0] || null;
}

export async function getUserVotes(userId: string, setlistSongIds: string[]) {
  if (setlistSongIds.length === 0) {
    return {};
  }

  const userVotes = await db
    .select({
      setlistSongId: votes.setlistSongId,
      voteType: votes.voteType,
    })
    .from(votes)
    .where(
      and(
        eq(votes.userId, userId),
        inArray(votes.setlistSongId, setlistSongIds),
      ),
    );

  // Downvotes removed: normalize to 'up' or omit
  const voteMap: Record<string, "up"> = {} as Record<string, "up">;
  userVotes.forEach((vote) => {
    if (vote.voteType === "up") {
      voteMap[vote.setlistSongId] = "up";
    }
  });

  return voteMap;
}

export async function getVoteCountsForSetlistSong(setlistSongId: string) {
  const counts = await db
    .select({
      upvotes: sql<number>`COUNT(*) FILTER (WHERE ${votes.voteType} = 'up')`,
    })
    .from(votes)
    .where(eq(votes.setlistSongId, setlistSongId));

  const upvotes = counts[0]?.upvotes ?? 0;
  return {
    upvotes,
    downvotes: 0,
    netVotes: upvotes,
  };
}

export async function getVoteCountsForSetlist(setlistId: string) {
  const counts = await db
    .select({
      setlistSongId: setlistSongs.id,
      upvotes: sql<number>`COUNT(*) FILTER (WHERE ${votes.voteType} = 'up')`,
    })
    .from(setlistSongs)
    .leftJoin(votes, eq(votes.setlistSongId, setlistSongs.id))
    .where(eq(setlistSongs.setlistId, setlistId))
    .groupBy(setlistSongs.id);

  const songVotes: Record<string, { upvotes: number; downvotes: number; netVotes: number }> = {};
  counts.forEach(({ setlistSongId, upvotes }) => {
    songVotes[setlistSongId] = { upvotes, downvotes: 0, netVotes: upvotes };
  });

  return songVotes;
}

export async function getTopVotedSongsForShow(
  showId: string,
  options?: {
    limit?: number;
    minVotes?: number;
    voteType?: "up" | "net";
  },
) {
  const { limit = 20, minVotes = 1, voteType = "net" } = options || {};

  const orderColumn = voteType === "up" ? setlistSongs.upvotes : setlistSongs.netVotes;

  const results = await db
    .select({
      setlistSong: setlistSongs,
      setlist: setlists,
      upvotes: setlistSongs.upvotes,
      downvotes: sql<number>`0` as unknown as number,
      netVotes: setlistSongs.netVotes,
    })
    .from(setlistSongs)
    .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
    .where(and(eq(setlists.showId, showId), gte(orderColumn, minVotes)))
    .orderBy(desc(orderColumn))
    .limit(limit);

  return results;
}

export async function getUserVotingHistory(
  userId: string,
  options?: {
    limit?: number;
    showId?: string;
    voteType?: "up";
    dateRange?: { from: Date; to: Date };
  },
) {
  const { limit = 50, showId, voteType, dateRange } = options || {};

  const conditions = [eq(votes.userId, userId)];

  if (showId) {
    conditions.push(eq(shows.id, showId));
  }

  if (voteType) {
    conditions.push(eq(votes.voteType, voteType));
  }

  if (dateRange) {
    conditions.push(
      and(
        gte(votes.createdAt, dateRange.from),
        lte(votes.createdAt, dateRange.to),
      ),
    );
  }

  const results = await db
    .select({
      vote: votes,
      setlistSong: setlistSongs,
      setlist: setlists,
      show: shows,
    })
    .from(votes)
    .innerJoin(setlistSongs, eq(votes.setlistSongId, setlistSongs.id))
    .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
    .innerJoin(shows, eq(setlists.showId, shows.id))
    .where(and(...conditions))
    .orderBy(desc(votes.createdAt))
    .limit(limit);

  return results;
}

export async function getVotingStatistics(options?: {
  showId?: string;
  userId?: string;
  timeRange?: "day" | "week" | "month" | "all";
}) {
  const { showId, userId, timeRange = "all" } = options || {};

  let dateCondition = sql`TRUE`;

  if (timeRange !== "all") {
    const intervals = {
      day: "1 day",
      week: "7 days",
      month: "30 days",
    };
    dateCondition = sql`${votes.createdAt} >= NOW() - INTERVAL '${sql.raw(intervals[timeRange])}'`;
  }

  const conditions = [dateCondition];

  if (showId) {
    conditions.push(sql`${setlists.showId} = ${showId}`);
  }

  if (userId) {
    conditions.push(sql`${votes.userId} = ${userId}`);
  }

  const whereClause = sql`${sql.join(conditions, sql` AND `)}`;

  const [totalVotes, voteBreakdown, topVoters, mostVotedSongs] =
    await Promise.all([
      // Total votes
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(votes)
        .innerJoin(setlistSongs, eq(votes.setlistSongId, setlistSongs.id))
        .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
        .where(whereClause),

      // Vote type breakdown
      db
        .select({
          upvotes: sql<number>`COUNT(*) FILTER (WHERE ${votes.voteType} = 'up')`,
        })
        .from(votes)
        .innerJoin(setlistSongs, eq(votes.setlistSongId, setlistSongs.id))
        .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
        .where(whereClause),

      // Top voters
      db
        .select({
          userId: votes.userId,
          username: users.username,
          totalVotes: sql<number>`COUNT(*)`,
          upvotes: sql<number>`COUNT(*) FILTER (WHERE ${votes.voteType} = 'up')`,
          downvotes: sql<number>`0`,
        })
        .from(votes)
        .innerJoin(users, eq(votes.userId, users.id))
        .innerJoin(setlistSongs, eq(votes.setlistSongId, setlistSongs.id))
        .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
        .where(whereClause)
        .groupBy(votes.userId, users.username)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10),

      // Most voted songs
      db
        .select({
          setlistSongId: setlistSongs.id,
          totalVotes: sql<number>`COUNT(*)`,
          upvotes: sql<number>`COUNT(*) FILTER (WHERE ${votes.voteType} = 'up')`,
          downvotes: sql<number>`0`,
          netVotes: sql<number>`COUNT(*) FILTER (WHERE ${votes.voteType} = 'up')`,
        })
        .from(votes)
        .innerJoin(setlistSongs, eq(votes.setlistSongId, setlistSongs.id))
        .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
        .where(whereClause)
        .groupBy(setlistSongs.id)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10),
    ]);

  return {
    totalVotes: totalVotes[0].count,
    voteBreakdown: { up: voteBreakdown[0]?.upvotes ?? 0, down: 0 },
    topVoters,
    mostVotedSongs,
  };
}

export async function getVotingTrends(options?: {
  showId?: string;
  days?: number;
  groupBy?: "hour" | "day";
}) {
  const { showId, days = 7, groupBy = "day" } = options || {};

  const dateFormat =
    groupBy === "hour"
      ? sql`DATE_TRUNC('hour', ${votes.createdAt})`
      : sql`DATE_TRUNC('day', ${votes.createdAt})`;

  const conditions = [
    gte(
      votes.createdAt,
      sql`NOW() - INTERVAL '${sql.raw(days.toString())} days'`,
    ),
  ];

  if (showId) {
    conditions.push(eq(setlists.showId, showId));
  }

  const query = db
    .select({
      period: dateFormat.as("period"),
      upvotes: sql<number>`COUNT(*) FILTER (WHERE ${votes.voteType} = 'up')`,
      downvotes: sql<number>`0`,
      totalVotes: sql<number>`COUNT(*)`,
    })
    .from(votes)
    .innerJoin(setlistSongs, eq(votes.setlistSongId, setlistSongs.id))
    .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
    .where(and(...conditions))
    .groupBy(dateFormat)
    .orderBy(asc(dateFormat));

  return await query;
}

export async function bulkUpdateVoteCounts(setlistSongIds: string[]) {
  if (setlistSongIds.length === 0) {
    return [];
  }

  // Calculate vote counts for all songs
  const voteCounts = await db
    .select({
      setlistSongId: votes.setlistSongId,
      upvotes: sql<number>`COUNT(*) FILTER (WHERE ${votes.voteType} = 'up')`,
    })
    .from(votes)
    .where(inArray(votes.setlistSongId, setlistSongIds))
    .groupBy(votes.setlistSongId);

  // Update each setlist song with current vote counts
  const updates = await Promise.all(
    voteCounts.map(({ setlistSongId, upvotes }) =>
      db
        .update(setlistSongs)
        .set({
          upvotes,
          downvotes: 0,
          netVotes: upvotes,
          updatedAt: new Date(),
        })
        .where(eq(setlistSongs.id, setlistSongId))
        .returning(),
    ),
  );

  return updates.flat();
}
