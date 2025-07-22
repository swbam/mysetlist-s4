import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';

// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';

interface ActivityItem {
  id: string;
  type: 'vote' | 'setlist_create';
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

  try {
    const supabase = await createServiceClient();
    const activities: ActivityItem[] = [];

    // Fetch recent votes with related data
    const { data: recentVotes } = await supabase
      .from('votes')
      .select(`
        id,
        user_id,
        vote_type,
        created_at,
        users!votes_user_id_fkey(
          display_name,
          user_profiles!user_profiles_user_id_fkey(
            avatar_url
          )
        ),
        setlist_songs!votes_setlist_song_id_fkey(
          songs!setlist_songs_song_id_fkey(
            id,
            title,
            artist
          ),
          setlists!setlist_songs_setlist_id_fkey(
            id,
            shows!setlists_show_id_fkey(
              id,
              name,
              slug,
              headliner_artist:artists!shows_headliner_artist_id_fkey(
                name
              )
            )
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(Math.ceil(limit / 3));

    if (recentVotes) {
      recentVotes.forEach((vote: any) => {
        const song = vote.setlist_songs?.songs;
        const show = vote.setlist_songs?.setlists?.shows;
        const user = vote.users;
        
        if (song && show && user) {
          activities.push({
            id: `vote-${vote.id}`,
            type: 'vote',
            user: {
              id: vote.user_id,
              displayName: user.display_name || 'Anonymous',
              ...(user.user_profiles?.avatar_url && { avatarUrl: user.user_profiles.avatar_url }),
            },
            target: {
              id: show.id,
              name: `${song.title} at ${show.headliner_artist?.name || show.name}`,
              slug: show.slug,
              type: 'show',
            },
            createdAt: vote.created_at,
            metadata: {
              voteType: vote.vote_type as 'up' | 'down',
            },
          });
        }
      });
    }

    // Fetch recent setlist creations
    const { data: recentSetlists } = await supabase
      .from('setlists')
      .select(`
        id,
        created_by,
        created_at,
        type,
        users!setlists_created_by_fkey(
          display_name,
          user_profiles!user_profiles_user_id_fkey(
            avatar_url
          )
        ),
        shows!setlists_show_id_fkey(
          id,
          name,
          slug,
          headliner_artist:artists!shows_headliner_artist_id_fkey(
            name
          )
        ),
        setlist_songs!setlist_songs_setlist_id_fkey(count)
      `)
      .eq('type', 'predicted')
      .order('created_at', { ascending: false })
      .limit(Math.floor(limit / 4));

    if (recentSetlists) {
      recentSetlists.forEach((setlist: any) => {
        const user = setlist.users;
        const show = setlist.shows;
        const songCount = setlist.setlist_songs?.[0]?.count || 0;
        
        if (setlist.created_by && user && show) {
          activities.push({
            id: `setlist-${setlist.id}`,
            type: 'setlist_create',
            user: {
              id: setlist.created_by,
              displayName: user.display_name || 'Anonymous',
              ...(user.user_profiles?.avatar_url && { avatarUrl: user.user_profiles.avatar_url }),
            },
            target: {
              id: show.id,
              name: show.headliner_artist?.name || show.name,
              slug: show.slug,
              type: 'show',
            },
            createdAt: setlist.created_at,
            metadata: {
              songCount: songCount,
            },
          });
        }
      });
    }

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
        : { songCount: Math.floor(Math.random() * 15) + 10 };

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
