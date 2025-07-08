import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '15');
    const offset = Number.parseInt(searchParams.get('offset') || '0');

    console.log('Recent activity API called with limit:', limit);

    // For now, we'll create mock data that matches the expected format
    // In production, this would query actual activity tables
    const mockActivities = generateMockActivities(limit);

    // Later, this would be replaced with actual database queries like:
    /*
    const recentVotes = await db
      .select({
        id: votes.id,
        type: sql<string>`'vote'`,
        userId: votes.userId,
        targetId: votes.artistId,
        targetType: sql<string>`'artist'`,
        createdAt: votes.createdAt,
        voteType: votes.voteType,
      })
      .from(votes)
      .innerJoin(users, eq(votes.userId, users.id))
      .innerJoin(artists, eq(votes.artistId, artists.id))
      .orderBy(desc(votes.createdAt))
      .limit(limit);
    */

    return NextResponse.json(
      {
        activities: mockActivities,
        total: mockActivities.length,
        hasMore: false, // Would be determined by actual query
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('Recent activity API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch recent activity',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function generateMockActivities(count: number) {
  const activityTypes = [
    'vote',
    'follow',
    'attendance',
    'setlist_create',
    'show_create',
  ] as const;
  const targetTypes = ['artist', 'show', 'venue', 'setlist'] as const;

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
    {
      id: '5',
      displayName: 'David Kim',
      avatarUrl: 'https://i.pravatar.cc/150?u=david',
    },
    { id: '6', displayName: 'Emma Wilson', avatarUrl: null },
    {
      id: '7',
      displayName: 'Michael Brown',
      avatarUrl: 'https://i.pravatar.cc/150?u=michael',
    },
    { id: '8', displayName: 'Lisa Anderson', avatarUrl: null },
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
    { id: '3', name: 'Drake', slug: 'drake', type: 'artist' as const },
    {
      id: '4',
      name: 'Madison Square Garden Show',
      slug: 'msg-2024-03-15',
      type: 'show' as const,
    },
    {
      id: '5',
      name: 'Hollywood Bowl',
      slug: 'hollywood-bowl',
      type: 'venue' as const,
    },
    {
      id: '6',
      name: 'Summer Tour 2024 Setlist',
      slug: 'summer-tour-2024',
      type: 'setlist' as const,
    },
    {
      id: '7',
      name: 'Coachella 2024',
      slug: 'coachella-2024',
      type: 'show' as const,
    },
    {
      id: '8',
      name: 'Red Rocks Amphitheatre',
      slug: 'red-rocks',
      type: 'venue' as const,
    },
  ];

  const activities = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const activityType =
      activityTypes[Math.floor(Math.random() * activityTypes.length)];
    const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];

    // Select appropriate target based on activity type
    let validTargets = mockTargets;
    if (activityType === 'vote' || activityType === 'follow') {
      validTargets = mockTargets.filter((t) => t.type === 'artist');
    } else if (activityType === 'attendance') {
      validTargets = mockTargets.filter((t) => t.type === 'show');
    } else if (activityType === 'setlist_create') {
      validTargets = mockTargets.filter(
        (t) => t.type === 'show' || t.type === 'setlist'
      );
    }

    const target =
      validTargets[Math.floor(Math.random() * validTargets.length)] ||
      mockTargets[0];

    // Generate timestamp within the last 24 hours
    const minutesAgo = Math.floor(Math.random() * 1440); // Up to 24 hours
    const createdAt = new Date(now.getTime() - minutesAgo * 60 * 1000);

    const activity = {
      id: `activity-${i + 1}-${Date.now()}`,
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
      metadata:
        activityType === 'vote'
          ? {
              voteType:
                Math.random() > 0.7 ? ('down' as const) : ('up' as const),
            }
          : activityType === 'setlist_create'
            ? { songCount: Math.floor(Math.random() * 15) + 10 }
            : undefined,
    };

    activities.push(activity);
  }

  // Sort by createdAt descending (most recent first)
  activities.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return activities;
}
