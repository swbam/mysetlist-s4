'use server';

import { createClient } from '@/lib/supabase/server';
import { cache } from 'react';

export type ShowWithDetails = {
  id: string;
  name: string;
  slug: string;
  date: string;
  startTime: string | null;
  doorsTime: string | null;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  description: string | null;
  ticketUrl: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  currency: string;
  viewCount: number;
  attendeeCount: number;
  setlistCount: number;
  voteCount: number;
  trendingScore: number;
  isFeatured: boolean;
  isVerified: boolean;
  headlinerArtist: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    genres: string[] | null;
    verified: boolean;
  };
  venue: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string | null;
    country: string;
    capacity: number | null;
  } | null;
  supportingArtists: Array<{
    id: string;
    artistId: string;
    orderIndex: number;
    setLength: number | null;
    artist: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
};

type FetchShowsParams = {
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  city?: string;
  artistId?: string;
  venueId?: string;
  dateFrom?: string;
  dateTo?: string;
  featured?: boolean;
  orderBy?: 'date' | 'trending' | 'popularity';
  limit?: number;
  offset?: number;
};

export const fetchShows = cache(
  async (
    params: FetchShowsParams = {}
  ): Promise<{
    shows: ShowWithDetails[];
    totalCount: number;
  }> => {
    const {
      status = 'upcoming',
      city,
      artistId,
      venueId,
      dateFrom,
      dateTo,
      featured,
      orderBy = 'date',
      limit = 20,
      offset = 0,
    } = params;

    try {
      const supabase = await createClient();
      
      // Build the query
      let query = supabase.from('shows').select(
        `
        *,
        headlinerArtist:artists!shows_headliner_artist_id_fkey(
          id,
          name,
          slug,
          imageUrl:image_url,
          genres,
          verified
        ),
        venue:venues!shows_venue_id_fkey(*),
        supportingArtists:show_artists!show_artists_show_id_fkey(
          id,
          artistId:artist_id,
          orderIndex:order_index,
          setLength:set_length,
          artist:artists(
            id,
            name,
            slug
          )
        )
      `,
        { count: 'exact' }
      );

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }

      if (artistId) {
        query = query.eq('headliner_artist_id', artistId);
      }

      if (venueId) {
        query = query.eq('venue_id', venueId);
      }

      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }

      if (dateTo) {
        query = query.lte('date', dateTo);
      }

      if (featured) {
        query = query.eq('is_featured', true);
      }

      if (city) {
        query = query.eq('venue.city', city);
      }

      // Apply ordering
      switch (orderBy) {
        case 'trending':
          query = query.order('trending_score', { ascending: false });
          break;
        case 'popularity':
          query = query.order('view_count', { ascending: false });
          break;
        case 'date':
        default:
          query = query.order('date', { ascending: true });
          break;
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching shows:', error);
        throw new Error('Failed to fetch shows');
      }

      // Transform the data to match our type
      const shows: ShowWithDetails[] = (data || []).map((show) => ({
        id: show.id,
        name: show.name,
        slug: show.slug,
        date: show.date,
        startTime: show.start_time,
        doorsTime: show.doors_time,
        status: show.status,
        description: show.description,
        ticketUrl: show.ticket_url,
        minPrice: show.min_price,
        maxPrice: show.max_price,
        currency: show.currency,
        viewCount: show.view_count,
        attendeeCount: show.attendee_count,
        setlistCount: show.setlist_count,
        voteCount: show.vote_count,
        trendingScore: show.trending_score,
        isFeatured: show.is_featured,
        isVerified: show.is_verified,
        headlinerArtist: {
          id: show.headlinerArtist.id,
          name: show.headlinerArtist.name,
          slug: show.headlinerArtist.slug,
          imageUrl: show.headlinerArtist.imageUrl,
          genres: show.headlinerArtist.genres
            ? JSON.parse(show.headlinerArtist.genres)
            : null,
          verified: show.headlinerArtist.verified,
        },
        venue: show.venue,
        supportingArtists: show.supportingArtists || [],
      }));

      return {
        shows,
        totalCount: count || 0,
      };
    } catch (error) {
      console.error('Error in fetchShows:', error);
      return {
        shows: [],
        totalCount: 0,
      };
    }
  }
);

export const fetchCities = cache(async (): Promise<string[]> => {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('venues')
      .select('city')
      .order('city');

    if (error) {
      console.error('Error fetching cities:', error);
      return [];
    }

    // Get unique cities
    const uniqueCities = [...new Set(data?.map((v) => v.city) || [])];
    return uniqueCities;
  } catch (error) {
    console.error('Error in fetchCities:', error);
    return [];
  }
});
