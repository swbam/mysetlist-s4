import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';
import { SpotifyClient } from '@repo/external-apis';

const POPULAR_ARTISTS = [
  'Taylor Swift',
  'Drake',
  'The Weeknd',
  'Bad Bunny',
  'Olivia Rodrigo',
  'Morgan Wallen',
  'Luke Combs',
  'SZA',
  'Dua Lipa',
  'Post Malone',
  'Ed Sheeran',
  'Ariana Grande',
  'Harry Styles',
  'Billie Eilish',
  'Travis Scott',
  'Doja Cat',
  'Metro Boomin',
  'Lana Del Rey',
  'Ice Spice',
  'Beyoncé'
];

export async function POST(request: NextRequest) {
  try {
    // Simple auth check
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceClient();
    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
      artists: [] as any[]
    };

    // Initialize Spotify client if credentials are available
    let spotify = null;
    if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
      try {
        spotify = new SpotifyClient({});
        await spotify.authenticate();
      } catch (error) {
        console.warn('Spotify authentication failed:', error);
      }
    }

    // Process each artist
    for (const artistName of POPULAR_ARTISTS) {
      try {
        // Check if artist already exists
        const { data: existingArtist } = await supabase
          .from('artists')
          .select('id, name')
          .eq('name', artistName)
          .single();

        if (existingArtist) {
          results.skipped++;
          continue;
        }

        // Try to get Spotify data
        let spotifyData = null;
        if (spotify) {
          try {
            const searchResults = await spotify.searchArtists(artistName, 1);
            if (searchResults.artists.items.length > 0) {
              spotifyData = searchResults.artists.items[0];
            }
          } catch (error) {
            console.warn(`Spotify search failed for ${artistName}:`, error);
          }
        }

        // Create artist
        const artistSlug = artistName.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        const { data: newArtist, error } = await supabase
          .from('artists')
          .insert({
            name: artistName,
            slug: artistSlug,
            spotify_id: spotifyData?.id || null,
            image_url: spotifyData?.images?.[0]?.url || null,
            small_image_url: spotifyData?.images?.[2]?.url || null,
            genres: spotifyData?.genres || [],
            popularity: spotifyData?.popularity || 0,
            followers: spotifyData?.followers?.total || 0,
            verified: (spotifyData?.followers?.total || 0) > 100000,
            external_urls: spotifyData ? {
              spotify: spotifyData.external_urls?.spotify || null
            } : {},
            trending_score: Math.floor(Math.random() * 50) + 50, // Give popular artists high trending scores
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          results.errors.push(`Failed to create ${artistName}: ${error.message}`);
        } else {
          results.created++;
          results.artists.push({
            id: newArtist.id,
            name: newArtist.name,
            slug: newArtist.slug,
            hasSpotifyData: !!spotifyData
          });
        }

        results.processed++;
      } catch (error) {
        results.errors.push(`Error processing ${artistName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Populated ${results.created} artists`,
      results
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to populate artists',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to populate initial artists',
    artists: POPULAR_ARTISTS
  });
}