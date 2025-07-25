import { formatDistanceToNow } from 'date-fns';
import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';

export interface ActivityItem {
  id: string;
  type: 'new_show' | 'setlist_added' | 'show_update' | 'artist_update';
  timestamp: string;
  artistId: string;
  artistName: string;
  artistImage?: string;
  title: string;
  description: string;
  link?: string;
  metadata?: Record<string, any>;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const offset = Number.parseInt(searchParams.get('offset') || '0');
    const timeWindow = Number.parseInt(searchParams.get('days') || '30');

    // Get user's followed artists
    const { data: followedArtists } = await supabase
      .from('user_follows_artists')
      .select('artist_id')
      .eq('user_id', user.id);

    if (!followedArtists || followedArtists.length === 0) {
      return NextResponse.json({
        activities: [],
        hasMore: false,
        message: 'Follow some artists to see activity',
      });
    }

    const artistIds = followedArtists.map((f) => f.artist_id);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeWindow);

    // Fetch different types of activities
    const activities: ActivityItem[] = [];

    // 1. New shows from followed artists
    const { data: newShows } = await supabase
      .from('shows')
      .select(`
        id,
        slug,
        show_date,
        created_at,
        artists!inner(id, name, slug, image_url),
        venues!inner(id, name, city)
      `)
      .in('artist_id', artistIds)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (newShows) {
      newShows.forEach((show) => {
        const artist = Array.isArray(show.artists)
          ? show.artists[0]
          : show.artists;
        const venue = Array.isArray(show.venues) ? show.venues[0] : show.venues;
        if (artist && venue) {
          activities.push({
            id: `show-${show.id}`,
            type: 'new_show',
            timestamp: show.created_at,
            artistId: artist.id,
            artistName: artist.name,
            artistImage: artist.image_url,
            title: `New show announced: ${artist.name}`,
            description: `${venue.name}, ${venue.city} - ${new Date(show.show_date).toLocaleDateString()}`,
            link: `/shows/${show.slug}`,
            metadata: {
              venueName: venue.name,
              venueCity: venue.city,
              showDate: show.show_date,
            },
          });
        }
      });
    }

    // 2. Recent setlists added to shows
    const { data: recentSetlists } = await supabase
      .from('setlist_songs')
      .select(`
        id,
        created_at,
        setlists!inner(
          id,
          shows!inner(
            id,
            slug,
            show_date,
            artist_id,
            artists!inner(id, name, slug, image_url),
            venues!inner(id, name, city)
          )
        )
      `)
      .in('setlists.shows.artist_id', artistIds)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (recentSetlists) {
      // Group by setlist to avoid duplicate entries
      const setlistMap = new Map();
      recentSetlists.forEach((item) => {
        const setlist = Array.isArray(item.setlists)
          ? item.setlists[0]
          : item.setlists;
        if (setlist) {
          const setlistId = setlist.id;
          if (!setlistMap.has(setlistId)) {
            setlistMap.set(setlistId, {
              ...setlist,
              created_at: item.created_at,
            });
          }
        }
      });

      setlistMap.forEach((setlist, setlistId) => {
        const show = Array.isArray(setlist.shows)
          ? setlist.shows[0]
          : setlist.shows;
        if (show) {
          const artist = Array.isArray(show.artists)
            ? show.artists[0]
            : show.artists;
          const venue = Array.isArray(show.venues)
            ? show.venues[0]
            : show.venues;
          if (artist && venue) {
            activities.push({
              id: `setlist-${setlistId}`,
              type: 'setlist_added',
              timestamp: setlist.created_at,
              artistId: artist.id,
              artistName: artist.name,
              artistImage: artist.image_url,
              title: `Setlist added for ${artist.name}`,
              description: `${venue.name}, ${venue.city}`,
              link: `/shows/${show.slug}`,
              metadata: {
                showDate: show.show_date,
                venueName: venue.name,
              },
            });
          }
        }
      });
    }

    // 3. Show updates (high vote activity)
    const { data: activeShows } = await supabase
      .from('show_votes')
      .select(`
        id,
        created_at,
        shows!inner(
          id,
          slug,
          show_date,
          artist_id,
          artists!inner(id, name, slug, image_url),
          venues!inner(id, name, city)
        )
      `)
      .in('shows.artist_id', artistIds)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false });

    if (activeShows) {
      // Group votes by show and count recent activity
      const showActivityMap = new Map();
      activeShows.forEach((vote) => {
        const show = Array.isArray(vote.shows) ? vote.shows[0] : vote.shows;
        if (show) {
          const showId = show.id;
          if (!showActivityMap.has(showId)) {
            showActivityMap.set(showId, {
              show: show,
              voteCount: 0,
              latestActivity: vote.created_at,
            });
          }
          showActivityMap.get(showId).voteCount++;
        }
      });

      // Add high-activity shows to feed
      showActivityMap.forEach((activity, showId) => {
        if (activity.voteCount >= 10) {
          // Threshold for "trending"
          activities.push({
            id: `trending-${showId}`,
            type: 'show_update',
            timestamp: activity.latestActivity,
            artistId: activity.show.artists.id,
            artistName: activity.show.artists.name,
            artistImage: activity.show.artists.image_url,
            title: `${activity.show.artists.name} show is trending`,
            description: `${activity.voteCount} recent votes at ${activity.show.venues.name}`,
            link: `/shows/${activity.show.slug}`,
            metadata: {
              voteCount: activity.voteCount,
              showDate: activity.show.show_date,
              venueName: activity.show.venues.name,
            },
          });
        }
      });
    }

    // Sort all activities by timestamp
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Paginate
    const paginatedActivities = activities.slice(offset, offset + limit);

    // Add relative time to each activity
    const activitiesWithRelativeTime = paginatedActivities.map((activity) => ({
      ...activity,
      relativeTime: formatDistanceToNow(new Date(activity.timestamp), {
        addSuffix: true,
      }),
    }));

    return NextResponse.json({
      activities: activitiesWithRelativeTime,
      total: activities.length,
      hasMore: offset + limit < activities.length,
      offset,
      limit,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch activity feed' },
      { status: 500 }
    );
  }
}
