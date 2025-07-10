import { db } from '@repo/database';
import {
  artists,
  setlistSongs,
  setlists,
  shows,
  songs,
  userFollowsArtists,
  userProfiles,
  userShowAttendance,
  users,
  venues,
  votes,
} from '@repo/database';
import { desc, eq, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

interface ActivityItem {
  id: string;
  type: 'vote' | 'follow' | 'attendance' | 'setlist_create';
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  target: {
    id: string;
    name: string;
    slug: string;
    type: 'artist' | 'show' | 'venue' | 'setlist';
  };
  createdAt: string;
  metadata?: {
    voteType?: 'up' | 'down';
    songCount?: number;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Number.parseInt(searchParams.get('limit') || '15');
  // const offset = Number.parseInt(searchParams.get('offset') || '0');

  try {
    const activities: ActivityItem[] = [];

    // Fetch recent votes
    const recentVotes = await db
      .select({
        id: votes.id,
        userId: votes.userId,
        userName: users.displayName,
        userAvatar: userProfiles.avatarUrl,
        voteType: votes.voteType,
        createdAt: votes.createdAt,
        songId: songs.id,
        songTitle: songs.title,
        songArtist: songs.artist,
        setlistId: setlists.id,
        showId: shows.id,
        showSlug: shows.slug,
        showName: shows.name,
        artistName: artists.name,
      })
      .from(votes)
      .innerJoin(users, eq(votes.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .innerJoin(setlistSongs, eq(votes.setlistSongId, setlistSongs.id))
      .innerJoin(songs, eq(setlistSongs.songId, songs.id))
      .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
      .innerJoin(shows, eq(setlists.showId, shows.id))
      .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .orderBy(desc(votes.createdAt))
      .limit(Math.ceil(limit / 3));

    recentVotes.forEach((vote) => {
      activities.push({
        id: `vote-${vote.id}`,
        type: 'vote',
        user: {
          id: vote.userId,
          displayName: vote.userName || 'Anonymous',
          ...(vote.userAvatar && { avatarUrl: vote.userAvatar }),
        },
        target: {
          id: vote.showId,
          name: `${vote.songTitle} at ${vote.artistName || vote.showName}`,
          slug: vote.showSlug,
          type: 'show',
        },
        createdAt: vote.createdAt.toISOString(),
        metadata: {
          voteType: vote.voteType as 'up' | 'down',
        },
      });
    });

    // Fetch recent follows
    const recentFollows = await db
      .select({
        id: userFollowsArtists.id,
        userId: userFollowsArtists.userId,
        userName: users.displayName,
        userAvatar: userProfiles.avatarUrl,
        artistId: artists.id,
        artistName: artists.name,
        artistSlug: artists.slug,
        createdAt: userFollowsArtists.createdAt,
      })
      .from(userFollowsArtists)
      .innerJoin(users, eq(userFollowsArtists.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .innerJoin(artists, eq(userFollowsArtists.artistId, artists.id))
      .orderBy(desc(userFollowsArtists.createdAt))
      .limit(Math.ceil(limit / 3));

    recentFollows.forEach((follow) => {
      activities.push({
        id: `follow-${follow.id}`,
        type: 'follow',
        user: {
          id: follow.userId,
          displayName: follow.userName || 'Anonymous',
          ...(follow.userAvatar && { avatarUrl: follow.userAvatar }),
        },
        target: {
          id: follow.artistId,
          name: follow.artistName,
          slug: follow.artistSlug,
          type: 'artist',
        },
        createdAt: follow.createdAt.toISOString(),
      });
    });

    // Fetch recent attendance updates
    const recentAttendance = await db
      .select({
        id: userShowAttendance.id,
        userId: userShowAttendance.userId,
        userName: users.displayName,
        userAvatar: userProfiles.avatarUrl,
        showId: shows.id,
        showName: shows.name,
        showSlug: shows.slug,
        artistName: artists.name,
        venueName: venues.name,
        createdAt: userShowAttendance.createdAt,
        status: userShowAttendance.status,
      })
      .from(userShowAttendance)
      .innerJoin(users, eq(userShowAttendance.userId, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .innerJoin(shows, eq(userShowAttendance.showId, shows.id))
      .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(eq(userShowAttendance.status, 'going'))
      .orderBy(desc(userShowAttendance.createdAt))
      .limit(Math.ceil(limit / 3));

    recentAttendance.forEach((attendance) => {
      const showName = attendance.artistName
        ? `${attendance.artistName} at ${attendance.venueName || 'TBA'}`
        : attendance.showName;

      activities.push({
        id: `attendance-${attendance.id}`,
        type: 'attendance',
        user: {
          id: attendance.userId,
          displayName: attendance.userName || 'Anonymous',
          ...(attendance.userAvatar && { avatarUrl: attendance.userAvatar }),
        },
        target: {
          id: attendance.showId,
          name: showName,
          slug: attendance.showSlug,
          type: 'show',
        },
        createdAt: attendance.createdAt.toISOString(),
      });
    });

    // Fetch recent setlist creations
    const recentSetlists = await db
      .select({
        id: setlists.id,
        userId: setlists.createdBy,
        userName: users.displayName,
        userAvatar: userProfiles.avatarUrl,
        showId: shows.id,
        showName: shows.name,
        showSlug: shows.slug,
        artistName: artists.name,
        createdAt: setlists.createdAt,
        songCount: sql<number>`COUNT(${setlistSongs.id})::int`.as('songCount'),
      })
      .from(setlists)
      .innerJoin(users, eq(setlists.createdBy, users.id))
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .innerJoin(shows, eq(setlists.showId, shows.id))
      .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(setlistSongs, eq(setlists.id, setlistSongs.setlistId))
      .where(eq(setlists.type, 'predicted'))
      .groupBy(
        setlists.id,
        setlists.createdBy,
        users.displayName,
        userProfiles.avatarUrl,
        shows.id,
        shows.name,
        shows.slug,
        artists.name,
        setlists.createdAt
      )
      .orderBy(desc(setlists.createdAt))
      .limit(Math.floor(limit / 4));

    recentSetlists.forEach((setlist) => {
      if (setlist.userId) {
        activities.push({
          id: `setlist-${setlist.id}`,
          type: 'setlist_create',
          user: {
            id: setlist.userId,
            displayName: setlist.userName || 'Anonymous',
            ...(setlist.userAvatar && { avatarUrl: setlist.userAvatar }),
          },
          target: {
            id: setlist.showId,
            name: setlist.artistName || setlist.showName,
            slug: setlist.showSlug,
            type: 'show',
          },
          createdAt: setlist.createdAt.toISOString(),
          metadata: {
            songCount: setlist.songCount || 0,
          },
        });
      }
    });

    // Sort all activities by createdAt descending
    activities.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply limit
    const limitedActivities = activities.slice(0, limit);

    const response = NextResponse.json(
      {
        activities: limitedActivities,
        total: limitedActivities.length,
        hasMore: activities.length > limit,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );

    return response;
  } catch (_error) {
    // Return mock data as fallback
    const mockActivities = generateMockActivities(limit);

    return NextResponse.json(
      {
        activities: mockActivities,
        total: mockActivities.length,
        hasMore: false,
        generatedAt: new Date().toISOString(),
        fallback: true,
        error: 'Using fallback data',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  }
}

// Keep the mock data generator as fallback
function generateMockActivities(count: number): ActivityItem[] {
  const activityTypes = [
    'vote',
    'follow',
    'attendance',
    'setlist_create',
  ] as const;

  const mockUsers = [
    {
      id: '1',
      displayName: 'Alex Johnson',
      avatarUrl: 'https://i.pravatar.cc/150?u=alex',
    },
    {
      id: '2',
      displayName: 'Maria Garcia',
      avatarUrl: 'https://i.pravatar.cc/150?u=maria',
    },
    {
      id: '3',
      displayName: 'James Chen',
      avatarUrl: 'https://i.pravatar.cc/150?u=james',
    },
    {
      id: '4',
      displayName: 'Sarah Miller',
      avatarUrl: 'https://i.pravatar.cc/150?u=sarah',
    },
  ];

  const mockTargets = [
    {
      id: '1',
      name: 'The Weeknd',
      slug: 'the-weeknd',
      type: 'artist' as const,
    },
    {
      id: '2',
      name: 'Taylor Swift',
      slug: 'taylor-swift',
      type: 'artist' as const,
    },
    {
      id: '3',
      name: 'Madison Square Garden Show',
      slug: 'msg-2024',
      type: 'show' as const,
    },
    {
      id: '4',
      name: 'Hollywood Bowl',
      slug: 'hollywood-bowl',
      type: 'venue' as const,
    },
  ];

  const activities: ActivityItem[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const activityType =
      activityTypes[Math.floor(Math.random() * activityTypes.length)] ?? 'vote';
    const user = mockUsers[Math.floor(Math.random() * mockUsers.length)]!;
    const target = mockTargets[Math.floor(Math.random() * mockTargets.length)]!;
    const minutesAgo = Math.floor(Math.random() * 1440);
    const createdAt = new Date(now.getTime() - minutesAgo * 60 * 1000);

    const metadata =
      activityType === 'vote'
        ? { voteType: Math.random() > 0.7 ? 'down' : 'up' as 'up' | 'down' }
        : activityType === 'setlist_create'
          ? { songCount: Math.floor(Math.random() * 15) + 10 }
          : undefined;

    activities.push({
      id: `mock-${i}-${Date.now()}`,
      type: activityType,
      user: {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      target: {
        id: target.id,
        name: target.name,
        slug: target.slug,
        type: target.type,
      },
      createdAt: createdAt.toISOString(),
      ...(metadata && { metadata }),
    });
  }

  return activities.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
