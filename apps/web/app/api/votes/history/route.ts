import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { votes, setlistSongs, songs, users, setlists, shows } from '@repo/database';
import { eq, and, desc, gte, count, sql, asc, isNotNull } from 'drizzle-orm';
import { getUser } from '@repo/auth/server';
import { startOfDay, subDays, eachDayOfInterval, format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const showId = searchParams.get('showId');
    const period = searchParams.get('period') || '7d';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // If no userId provided, try to get from auth
    let targetUserId = userId;
    if (!targetUserId) {
      const user = await getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      targetUserId = user.id;
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '1d':
        startDate = subDays(now, 1);
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Build vote history query
    let voteQuery = db
      .select({
        id: votes.id,
        voteType: votes.voteType,
        createdAt: votes.createdAt,
        updatedAt: votes.updatedAt,
        setlistSongId: votes.setlistSongId,
        song: {
          title: songs.title,
          artist: songs.artist,
        },
        show: {
          name: shows.name,
          date: shows.date,
        },
        currentVotes: {
          upvotes: setlistSongs.upvotes,
          downvotes: setlistSongs.downvotes,
          netVotes: setlistSongs.netVotes,
        }
      })
      .from(votes)
      .innerJoin(setlistSongs, eq(votes.setlistSongId, setlistSongs.id))
      .innerJoin(songs, eq(setlistSongs.songId, songs.id))
      .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
      .innerJoin(shows, eq(setlists.showId, shows.id))
      .where(eq(votes.userId, targetUserId));

    // Apply show filter if provided
    if (showId) {
      voteQuery = voteQuery.where(eq(shows.id, showId));
    }

    // Apply date filter if not all time
    if (period !== 'all') {
      voteQuery = voteQuery.where(gte(votes.createdAt, startDate));
    }

    // Add pagination
    const offset = (page - 1) * limit;
    const paginatedQuery = voteQuery
      .orderBy(desc(votes.createdAt))
      .limit(limit + 1) // Get one extra to check if there are more
      .offset(offset);

    const voteHistory = await paginatedQuery;
    
    // Check if there are more results
    const hasMore = voteHistory.length > limit;
    if (hasMore) {
      voteHistory.pop(); // Remove the extra record
    }

    // Format history data
    const history = voteHistory.map(vote => ({
      id: vote.id,
      songTitle: vote.song.title,
      artist: vote.song.artist,
      voteType: vote.voteType,
      createdAt: vote.createdAt.toISOString(),
      updatedAt: vote.updatedAt.toISOString(),
      showName: vote.show.name,
      showDate: vote.show.date.toISOString(),
      setlistSongId: vote.setlistSongId,
      currentNetVotes: vote.currentVotes.netVotes,
    }));

    // Calculate voting pattern (only on first page)
    let pattern = null;
    let dailyData = null;

    if (page === 1) {
      // Get all votes for pattern analysis (within the time period)
      let allVotesQuery = db
        .select({
          voteType: votes.voteType,
          createdAt: votes.createdAt,
        })
        .from(votes)
        .where(eq(votes.userId, targetUserId));

      if (showId) {
        allVotesQuery = allVotesQuery
          .innerJoin(setlistSongs, eq(votes.setlistSongId, setlistSongs.id))
          .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
          .innerJoin(shows, eq(setlists.showId, shows.id))
          .where(and(eq(votes.userId, targetUserId), eq(shows.id, showId)));
      }

      if (period !== 'all') {
        allVotesQuery = allVotesQuery.where(gte(votes.createdAt, startDate));
      }

      const allVotes = await allVotesQuery;

      // Calculate pattern statistics
      const totalVotes = allVotes.length;
      const upvotes = allVotes.filter(v => v.voteType === 'up').length;
      const downvotes = allVotes.filter(v => v.voteType === 'down').length;

      // Calculate most active hour
      const hourCounts = new Array(24).fill(0);
      allVotes.forEach(vote => {
        const hour = vote.createdAt.getHours();
        hourCounts[hour]++;
      });
      const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));

      // Calculate daily data for chart
      const days = period === 'all' ? 30 : Math.min(30, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const chartStartDate = subDays(now, days - 1);
      const dateRange = eachDayOfInterval({ start: chartStartDate, end: now });

      dailyData = dateRange.map(date => {
        const startOfDayDate = startOfDay(date);
        const endOfDayDate = new Date(startOfDayDate);
        endOfDayDate.setDate(endOfDayDate.getDate() + 1);

        const dayVotes = allVotes.filter(vote => 
          vote.createdAt >= startOfDayDate && vote.createdAt < endOfDayDate
        );

        return {
          date: format(date, 'yyyy-MM-dd'),
          votes: dayVotes.length,
          upvotes: dayVotes.filter(v => v.voteType === 'up').length,
          downvotes: dayVotes.filter(v => v.voteType === 'down').length,
        };
      });

      // Calculate voting streak (consecutive days with votes)
      let votingStreak = 0;
      const today = startOfDay(now);
      
      for (let i = 0; i < 30; i++) {
        const checkDate = subDays(today, i);
        const hasVotesOnDay = allVotes.some(vote => {
          const voteDate = startOfDay(vote.createdAt);
          return voteDate.getTime() === checkDate.getTime();
        });
        
        if (hasVotesOnDay) {
          votingStreak++;
        } else {
          break;
        }
      }

      // Calculate average votes per day
      const daysPeriod = period === 'all' ? 
        Math.max(1, Math.ceil((now.getTime() - (allVotes[allVotes.length - 1]?.createdAt.getTime() || now.getTime())) / (1000 * 60 * 60 * 24))) :
        Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const averageVotesPerDay = totalVotes / Math.max(1, daysPeriod);

      // Determine recent trend (simplified)
      const recentVotes = allVotes.filter(v => v.createdAt >= subDays(now, 3));
      const olderVotes = allVotes.filter(v => 
        v.createdAt >= subDays(now, 6) && v.createdAt < subDays(now, 3)
      );
      
      let recentTrend: 'up' | 'down' | 'stable' = 'stable';
      if (recentVotes.length > olderVotes.length) {
        recentTrend = 'up';
      } else if (recentVotes.length < olderVotes.length) {
        recentTrend = 'down';
      }

      pattern = {
        totalVotes,
        upvotes,
        downvotes,
        favoriteGenres: [], // TODO: Implement genre analysis
        mostActiveHour: totalVotes > 0 ? mostActiveHour : 0,
        votingStreak,
        averageVotesPerDay,
        recentTrend,
      };
    }

    return NextResponse.json({
      history,
      pattern,
      dailyData,
      hasMore,
      page,
      period,
    });

  } catch (error) {
    console.error('Vote history API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}