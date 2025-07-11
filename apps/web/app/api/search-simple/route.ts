import { TicketmasterClient } from '@repo/external-apis';
import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']!;
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SearchResult {
  id: string;
  type: 'artist';
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  slug: string;
  verified?: boolean;
  ticketmasterId?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limit = Number.parseInt(searchParams.get('limit') || '10');

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results: SearchResult[] = [];

    // Search Ticketmaster for artists
    const ticketmasterClient = new TicketmasterClient({});

    const response = await ticketmasterClient.searchAttractions({
      keyword: query,
      size: limit,
      classificationName: 'Music',
      sort: 'relevance,desc',
    });

    if (response._embedded?.attractions) {
      for (const attraction of response._embedded.attractions) {
        const artist: SearchResult = {
          id: attraction.id,
          type: 'artist',
          title: attraction.name,
          subtitle: attraction.classifications?.[0]?.genre?.name || 'Artist',
          imageUrl: attraction.images?.[0]?.url || null,
          slug: generateSlug(attraction.name),
          verified: false,
          ticketmasterId: attraction.id,
        };
        results.push(artist);

        // Sync to database
        await syncArtistToDatabase(artist);
      }
    }

    return NextResponse.json({
      results,
      total: results.length,
      query,
    });
  } catch (error) {
    return NextResponse.json({
      results: [],
      error: 'Search failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function syncArtistToDatabase(artist: SearchResult) {
  try {
    // Check if artist already exists
    const { data: existing } = await supabase
      .from('artists')
      .select('id')
      .ilike('name', artist.title)
      .limit(1);

    if (existing && existing.length > 0) {
      return;
    }

    // Insert new artist
    const { data: result, error: insertError } = await supabase
      .from('artists')
      .insert({
        name: artist.title,
        slug: artist.slug,
        external_ids: {
          ticketmaster_id: artist.ticketmasterId,
        },
        image_url: artist.imageUrl,
        genres: artist.subtitle || 'Artist',
        bio: `${artist.title} is a ${artist.subtitle || 'music'} artist.`,
        verified: false,
        popularity: 50,
        followers: 0,
      })
      .select('id, name, slug')
      .single();

    if (insertError) {
      return;
    }

    if (result) {
    }
  } catch (_error) {}
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
