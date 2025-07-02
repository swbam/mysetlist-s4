import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { votes, setlistSongs, songs, users, setlists, shows } from '@repo/database';
import { eq, and, desc, gte, count, sql, asc, isNotNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showId = searchParams.get('showId');
    const setlistId = searchParams.get('setlistId');

    if (!showId) {
      return NextResponse.json({ error: 'Missing showId parameter' }, { status: 400 });
    }

    // Get all setlist songs for this show (optionally filtered by setlist)
    let setlistSongsQuery = db
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
          albumArtUrl: songs.albumArtUrl,
          spotifyId: songs.spotifyId,
        }
      })
      .from(setlistSongs)
      .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
      .innerJoin(songs, eq(setlistSongs.songId, songs.id))
      .where(eq(setlists.showId, showId));

    if (setlistId) {
      setlistSongsQuery = setlistSongsQuery.where(eq(setlistSongs.setlistId, setlistId));
    }

    const setlistSongsData = await setlistSongsQuery;

    if (setlistSongsData.length === 0) {
      return NextResponse.json({
        topVoters: [],
        topSongs: [],
        mostDebated: [],
        risingStars: []
      });
    }

    const setlistSongIds = setlistSongsData.map(s => s.id);

    // Get all votes with user information
    const allVotes = await db
      .select({
        id: votes.id,
        userId: votes.userId,
        setlistSongId: votes.setlistSongId,
        voteType: votes.voteType,
        createdAt: votes.createdAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
        }
      })
      .from(votes)
      .leftJoin(users, eq(votes.userId, users.id))
      .where(sql`${votes.setlistSongId} = ANY(${setlistSongIds})`)
      .orderBy(desc(votes.createdAt));

    // Calculate top voters
    const voterStats = new Map<string, {
      id: string;
      username: string;
      displayName?: string;
      avatarUrl?: string;
      totalVotes: number;
      upvotes: number;
      downvotes: number;
      joinedDate?: string;
      recentVotes: number; // votes in last 24 hours
    }>();

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    allVotes.forEach(vote => {
      const userId = vote.userId;
      if (!voterStats.has(userId)) {
        voterStats.set(userId, {
          id: userId,
          username: vote.user?.username || 'Anonymous',
          displayName: vote.user?.displayName,
          avatarUrl: vote.user?.avatarUrl,
          totalVotes: 0,
          upvotes: 0,
          downvotes: 0,
          joinedDate: vote.user?.createdAt?.toISOString(),
          recentVotes: 0,
        });
      }

      const stats = voterStats.get(userId)!;
      stats.totalVotes++;
      
      if (vote.voteType === 'up') {
        stats.upvotes++;
      } else if (vote.voteType === 'down') {
        stats.downvotes++;
      }

      // Count recent votes for rising stars calculation
      if (vote.createdAt >= oneDayAgo) {
        stats.recentVotes++;
      }
    });

    // Top voters by total votes
    const topVoters = Array.from(voterStats.values())
      .sort((a, b) => {
        if (b.totalVotes !== a.totalVotes) {
          return b.totalVotes - a.totalVotes;
        }
        // Tie-breaker: more upvotes wins
        return b.upvotes - a.upvotes;
      })
      .slice(0, 10)
      .map((voter, index) => ({
        ...voter,
        rank: index + 1,
        // Calculate streak days (simplified - based on recent activity)
        streakDays: voter.recentVotes > 0 ? Math.min(voter.recentVotes + 1, 7) : undefined,
      }));

    // Top songs by net votes
    const topSongs = setlistSongsData
      .map((songData, index) => ({
        id: songData.id,
        title: songData.song.title,
        artist: songData.song.artist,
        albumArt: songData.song.albumArtUrl,
        spotifyId: songData.song.spotifyId,
        netVotes: songData.netVotes,
        upvotes: songData.upvotes,
        downvotes: songData.downvotes,
        totalVotes: songData.upvotes + songData.downvotes,
        rank: index + 1
      }))
      .sort((a, b) => {
        // Primary sort: net votes (descending)
        if (b.netVotes !== a.netVotes) {
          return b.netVotes - a.netVotes;
        }
        // Secondary sort: total votes (descending)
        return b.totalVotes - a.totalVotes;
      })
      .map((song, index) => ({
        ...song,
        rank: index + 1
      }))
      .slice(0, 10);

    // Most debated songs (highest total votes, regardless of net)
    const mostDebated = setlistSongsData
      .map(songData => ({
        id: songData.id,
        title: songData.song.title,
        artist: songData.song.artist,
        albumArt: songData.song.albumArtUrl,
        spotifyId: songData.song.spotifyId,
        netVotes: songData.netVotes,
        upvotes: songData.upvotes,
        downvotes: songData.downvotes,
        totalVotes: songData.upvotes + songData.downvotes,
        rank: 0 // Will be set after sorting
      }))
      .filter(song => song.totalVotes > 0)
      .sort((a, b) => {
        // Primary sort: total votes (descending)
        if (b.totalVotes !== a.totalVotes) {
          return b.totalVotes - a.totalVotes;
        }
        // Secondary sort: closer to 50/50 split = more controversial
        const aBalance = Math.abs(a.upvotes - a.downvotes) / a.totalVotes;
        const bBalance = Math.abs(b.upvotes - b.downvotes) / b.totalVotes;
        return aBalance - bBalance;
      })
      .slice(0, 10)
      .map((song, index) => ({
        ...song,
        rank: index + 1
      }));

    // Rising stars - new users with significant recent activity
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const risingStars = Array.from(voterStats.values())
      .filter(voter => {
        // Must be a new user (joined within last week) or have significant recent activity
        const isNewUser = voter.joinedDate && new Date(voter.joinedDate) >= oneWeekAgo;
        const hasRecentActivity = voter.recentVotes >= 3;
        const hasGoodRatio = voter.totalVotes >= 5;
        
        return (isNewUser || hasRecentActivity) && hasGoodRatio;
      })
      .sort((a, b) => {
        // Sort by recent activity and engagement
        const aScore = a.recentVotes * 2 + a.totalVotes;
        const bScore = b.recentVotes * 2 + b.totalVotes;
        return bScore - aScore;
      })
      .slice(0, 10)
      .map((voter, index) => ({
        ...voter,
        rank: index + 1,
      }));

    return NextResponse.json({
      topVoters,
      topSongs,
      mostDebated,
      risingStars,
    });

  } catch (error) {
    console.error('Vote leaderboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}