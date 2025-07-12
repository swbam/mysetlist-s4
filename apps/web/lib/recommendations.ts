import { cache } from 'react';
import { createClient } from '~/lib/supabase/server';

export interface RecommendedItem {
  id: string;
  type: 'show' | 'artist' | 'venue';
  name: string;
  reason: string;
  score: number;
  image_url?: string;
  slug?: string;
  metadata?: Record<string, any>;
}

export interface UserPreferences {
  favoriteGenres: string[];
  favoriteArtists: string[];
  favoriteVenues: string[];
  attendedShows: string[];
  votedShows: string[];
  followedArtists: string[];
}

export interface RecommendationConfig {
  limit: number;
  includeUpcoming: boolean;
  includePast: boolean;
  maxDistance?: number; // km
  userLocation?: { lat: number; lng: number };
}

const DEFAULT_CONFIG: RecommendationConfig = {
  limit: 20,
  includeUpcoming: true,
  includePast: false,
};

export const getUserPreferences = cache(
  async (userId: string): Promise<UserPreferences> => {
    const supabase = await createClient();

    // Get user's followed artists
    const { data: followedArtists } = await supabase
      .from('user_follows_artists')
      .select('artist_id')
      .eq('user_id', userId);

    // Get user's voted shows
    const { data: votedShows } = await supabase
      .from('show_votes')
      .select('show_id')
      .eq('user_id', userId);

    // Get user's attended shows
    const { data: attendedShows } = await supabase
      .from('show_attendees')
      .select('show_id')
      .eq('user_id', userId);

    // Get favorite artists from votes and attendance
    const showIds = [
      ...(votedShows?.map((v) => v.show_id) || []),
      ...(attendedShows?.map((a) => a.show_id) || []),
    ];

    let favoriteArtists: string[] = [];
    let favoriteVenues: string[] = [];
    let favoriteGenres: string[] = [];

    if (showIds.length > 0) {
      const { data: shows } = await supabase
        .from('shows')
        .select(`
        artist_id,
        venue_id,
        artists!inner(id, name, genres)
      `)
        .in('id', showIds);

      if (shows) {
        favoriteArtists = [...new Set(shows.map((s) => s.artist_id))];
        favoriteVenues = [...new Set(shows.map((s) => s.venue_id))];

        // Extract genres from artists
        const allGenres = shows.flatMap((s) => {
          const artists = Array.isArray(s.artists) ? s.artists : [s.artists];
          return artists.flatMap(artist => artist?.genres || []);
        });
        const genreCounts = allGenres.reduce(
          (acc, genre) => {
            acc[genre] = (acc[genre] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        // Get top genres
        favoriteGenres = Object.entries(genreCounts)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([genre]) => genre);
      }
    }

    return {
      favoriteGenres,
      favoriteArtists,
      favoriteVenues,
      attendedShows: attendedShows?.map((a) => a.show_id) || [],
      votedShows: votedShows?.map((v) => v.show_id) || [],
      followedArtists: followedArtists?.map((f) => f.artist_id) || [],
    };
  }
);

export async function getRecommendedShows(
  userId: string,
  config: RecommendationConfig = DEFAULT_CONFIG
): Promise<RecommendedItem[]> {
  const supabase = await createClient();
  const preferences = await getUserPreferences(userId);

  const recommendations: RecommendedItem[] = [];
  const seenShowIds = new Set([
    ...preferences.attendedShows,
    ...preferences.votedShows,
  ]);

  // 1. Shows by followed artists
  if (preferences.followedArtists.length > 0) {
    const { data: followedArtistShows } = await supabase
      .from('shows')
      .select(`
        id,
        slug,
        show_date,
        artists!inner(id, name, image_url),
        venues!inner(id, name, city)
      `)
      .in('artist_id', preferences.followedArtists)
      .not('id', 'in', `(${Array.from(seenShowIds).join(',')})`)
      .gte(
        'show_date',
        config.includeUpcoming ? new Date().toISOString() : '1970-01-01'
      )
      .lte(
        'show_date',
        config.includePast ? '2100-01-01' : new Date().toISOString()
      )
      .order('show_date', { ascending: true })
      .limit(10);

    if (followedArtistShows) {
      followedArtistShows.forEach((show) => {
        const artist = Array.isArray(show.artists) ? show.artists[0] : show.artists;
        const venue = Array.isArray(show.venues) ? show.venues[0] : show.venues;
        recommendations.push({
          id: show.id,
          type: 'show',
          name: `${artist?.name} at ${venue?.name}`,
          reason: `You follow ${artist?.name}`,
          score: 0.9,
          image_url: artist?.image_url,
          slug: show.slug,
          metadata: {
            artist_name: artist?.name,
            venue_name: `${venue?.name}, ${venue?.city}`,
            show_date: show.show_date,
          },
        });
      });
    }
  }

  // 2. Shows at favorite venues
  if (preferences.favoriteVenues.length > 0) {
    const { data: venueShows } = await supabase
      .from('shows')
      .select(`
        id,
        slug,
        show_date,
        artists!inner(id, name, image_url),
        venues!inner(id, name, city)
      `)
      .in('venue_id', preferences.favoriteVenues)
      .not('id', 'in', `(${Array.from(seenShowIds).join(',')})`)
      .gte(
        'show_date',
        config.includeUpcoming ? new Date().toISOString() : '1970-01-01'
      )
      .lte(
        'show_date',
        config.includePast ? '2100-01-01' : new Date().toISOString()
      )
      .order('show_date', { ascending: true })
      .limit(10);

    if (venueShows) {
      venueShows.forEach((show) => {
        const artist = Array.isArray(show.artists) ? show.artists[0] : show.artists;
        const venue = Array.isArray(show.venues) ? show.venues[0] : show.venues;
        recommendations.push({
          id: show.id,
          type: 'show',
          name: `${artist?.name} at ${venue?.name}`,
          reason: `At your favorite venue: ${venue?.name}`,
          score: 0.8,
          image_url: artist?.image_url,
          slug: show.slug,
          metadata: {
            artist_name: artist?.name,
            venue_name: `${venue?.name}, ${venue?.city}`,
            show_date: show.show_date,
          },
        });
      });
    }
  }

  // 3. Shows by similar artists (based on genres)
  if (preferences.favoriteGenres.length > 0) {
    const { data: genreArtists } = await supabase
      .from('artists')
      .select('id')
      .contains('genres', preferences.favoriteGenres)
      .not('id', 'in', `(${preferences.followedArtists.join(',')})`);

    if (genreArtists && genreArtists.length > 0) {
      const { data: genreShows } = await supabase
        .from('shows')
        .select(`
          id,
          slug,
          show_date,
          artists!inner(id, name, image_url, genres),
          venues!inner(id, name, city)
        `)
        .in(
          'artist_id',
          genreArtists.map((a) => a.id)
        )
        .not('id', 'in', `(${Array.from(seenShowIds).join(',')})`)
        .gte(
          'show_date',
          config.includeUpcoming ? new Date().toISOString() : '1970-01-01'
        )
        .lte(
          'show_date',
          config.includePast ? '2100-01-01' : new Date().toISOString()
        )
        .order('show_date', { ascending: true })
        .limit(10);

      if (genreShows) {
        genreShows.forEach((show) => {
          const artist = Array.isArray(show.artists) ? show.artists[0] : show.artists;
          const venue = Array.isArray(show.venues) ? show.venues[0] : show.venues;
          const matchingGenres =
            artist?.genres?.filter((g: string) =>
              preferences.favoriteGenres.includes(g)
            ) || [];

          recommendations.push({
            id: show.id,
            type: 'show',
            name: `${artist?.name} at ${venue?.name}`,
            reason: `Similar to your taste: ${matchingGenres.join(', ')}`,
            score: 0.7,
            image_url: artist?.image_url,
            slug: show.slug,
            metadata: {
              artist_name: artist?.name,
              venue_name: `${venue?.name}, ${venue?.city}`,
              show_date: show.show_date,
              genres: matchingGenres,
            },
          });
        });
      }
    }
  }

  // Remove duplicates and sort by score
  const uniqueRecommendations = Array.from(
    new Map(recommendations.map((item) => [item.id, item])).values()
  );

  return uniqueRecommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, config.limit);
}

export async function getRecommendedArtists(
  userId: string,
  config: RecommendationConfig = DEFAULT_CONFIG
): Promise<RecommendedItem[]> {
  const supabase = await createClient();
  const preferences = await getUserPreferences(userId);

  const recommendations: RecommendedItem[] = [];
  const seenArtistIds = new Set([
    ...preferences.favoriteArtists,
    ...preferences.followedArtists,
  ]);

  // 1. Artists similar to followed artists (by genre)
  if (preferences.favoriteGenres.length > 0) {
    const { data: similarArtists } = await supabase
      .from('artists')
      .select(`
        id,
        name,
        slug,
        image_url,
        genres,
        user_follows_artists(count)
      `)
      .contains('genres', preferences.favoriteGenres)
      .not('id', 'in', `(${Array.from(seenArtistIds).join(',')})`)
      .order('user_follows_artists.count', { ascending: false })
      .limit(15);

    if (similarArtists) {
      similarArtists.forEach((artist) => {
        const matchingGenres =
          artist.genres?.filter((g: string) =>
            preferences.favoriteGenres.includes(g)
          ) || [];

        recommendations.push({
          id: artist.id,
          type: 'artist',
          name: artist.name,
          reason: `Similar genres: ${matchingGenres.join(', ')}`,
          score: 0.8 + (artist.user_follows_artists?.[0]?.count || 0) / 10000,
          image_url: artist.image_url,
          slug: artist.slug,
          metadata: {
            genres: matchingGenres,
            followers: artist.user_follows_artists?.[0]?.count || 0,
          },
        });
      });
    }
  }

  // 2. Artists who performed at favorite venues
  if (preferences.favoriteVenues.length > 0) {
    const { data: venueArtists } = await supabase
      .from('shows')
      .select(`
        artists!inner(id, name, slug, image_url)
      `)
      .in('venue_id', preferences.favoriteVenues)
      .not('artist_id', 'in', `(${Array.from(seenArtistIds).join(',')})`)
      .gte(
        'show_date',
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
      ) // Last year
      .limit(20);

    if (venueArtists) {
      const uniqueArtists = Array.from(
        new Map(venueArtists.map((va) => {
          const artist = Array.isArray(va.artists) ? va.artists[0] : va.artists;
          return [artist?.id, artist];
        })).values()
      );

      uniqueArtists.forEach((artist) => {
        if (artist?.id) {
          recommendations.push({
            id: artist.id,
            type: 'artist',
            name: artist.name,
            reason: 'Performed at venues you like',
            score: 0.7,
            image_url: artist.image_url,
            slug: artist.slug,
          });
        }
      });
    }
  }

  // Remove duplicates and sort by score
  const uniqueRecommendations = Array.from(
    new Map(recommendations.map((item) => [item.id, item])).values()
  );

  return uniqueRecommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, config.limit);
}

export async function getRecommendedVenues(
  userId: string,
  config: RecommendationConfig = DEFAULT_CONFIG
): Promise<RecommendedItem[]> {
  const supabase = await createClient();
  const preferences = await getUserPreferences(userId);

  const recommendations: RecommendedItem[] = [];
  const seenVenueIds = new Set(preferences.favoriteVenues);

  // Get cities from favorite venues
  let favoriteCities: string[] = [];
  if (preferences.favoriteVenues.length > 0) {
    const { data: venues } = await supabase
      .from('venues')
      .select('city')
      .in('id', preferences.favoriteVenues);

    if (venues) {
      favoriteCities = [...new Set(venues.map((v) => v.city))];
    }
  }

  // 1. Venues in favorite cities
  if (favoriteCities.length > 0) {
    const { data: cityVenues } = await supabase
      .from('venues')
      .select(`
        id,
        name,
        slug,
        city,
        image_url,
        capacity,
        shows(count)
      `)
      .in('city', favoriteCities)
      .not('id', 'in', `(${Array.from(seenVenueIds).join(',')})`)
      .order('shows.count', { ascending: false })
      .limit(15);

    if (cityVenues) {
      cityVenues.forEach((venue) => {
        recommendations.push({
          id: venue.id,
          type: 'venue',
          name: venue.name,
          reason: `In ${venue.city} where you attend shows`,
          score: 0.8 + (venue.shows?.[0]?.count || 0) / 1000,
          image_url: venue.image_url,
          slug: venue.slug,
          metadata: {
            city: venue.city,
            capacity: venue.capacity,
            show_count: venue.shows?.[0]?.count || 0,
          },
        });
      });
    }
  }

  // 2. Venues that host your favorite artists
  if (preferences.favoriteArtists.length > 0) {
    const { data: artistVenues } = await supabase
      .from('shows')
      .select(`
        venues!inner(id, name, slug, city, image_url, capacity)
      `)
      .in('artist_id', preferences.favoriteArtists)
      .not('venue_id', 'in', `(${Array.from(seenVenueIds).join(',')})`)
      .gte(
        'show_date',
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
      )
      .limit(20);

    if (artistVenues) {
      const uniqueVenues = Array.from(
        new Map(artistVenues.map((av) => {
          const venue = Array.isArray(av.venues) ? av.venues[0] : av.venues;
          return [venue?.id, venue];
        })).values()
      );

      uniqueVenues.forEach((venue) => {
        if (venue?.id) {
          recommendations.push({
            id: venue.id,
            type: 'venue',
            name: venue.name,
            reason: 'Hosts artists you follow',
            score: 0.7,
            image_url: venue.image_url,
            slug: venue.slug,
            metadata: {
              city: venue.city,
              capacity: venue.capacity,
            },
          });
        }
      });
    }
  }

  // Remove duplicates and sort by score
  const uniqueRecommendations = Array.from(
    new Map(recommendations.map((item) => [item.id, item])).values()
  );

  return uniqueRecommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, config.limit);
}

export async function getPersonalizedRecommendations(
  userId: string,
  config: RecommendationConfig = DEFAULT_CONFIG
): Promise<{
  shows: RecommendedItem[];
  artists: RecommendedItem[];
  venues: RecommendedItem[];
}> {
  const [shows, artists, venues] = await Promise.all([
    getRecommendedShows(userId, config),
    getRecommendedArtists(userId, config),
    getRecommendedVenues(userId, config),
  ]);

  return {
    shows,
    artists,
    venues,
  };
}
