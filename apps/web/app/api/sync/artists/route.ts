import { NextRequest, NextResponse } from 'next/server';
import { SpotifyClient } from '@repo/external-apis';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { searchQuery } = await request.json();
    
    if (!searchQuery) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 });
    }

    console.log(`🔍 Syncing artists from Spotify for query: "${searchQuery}"`);

    // Search Spotify for artists
    const spotifyClient = new SpotifyClient({});
    await spotifyClient.authenticate();
    
    const spotifyResponse = await spotifyClient.searchArtists(searchQuery, 10);
    
    if (!spotifyResponse.artists.items.length) {
      return NextResponse.json({ 
        message: 'No artists found',
        synced: 0 
      });
    }

    const syncedArtists = [];

    // Sync each artist to database using Supabase MCP
    for (const spotifyArtist of spotifyResponse.artists.items) {
      try {
        const slug = generateSlug(spotifyArtist.name);
        
        // Check if artist already exists
        const { data: existing } = await supabase
          .from('artists')
          .select('id')
          .or(`spotify_id.eq.${spotifyArtist.id},name.ilike.${spotifyArtist.name}`)
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`Artist ${spotifyArtist.name} already exists, skipping`);
          continue;
        }

        // Insert new artist
        const { data: result, error: insertError } = await supabase
          .from('artists')
          .insert({
            name: spotifyArtist.name,
            slug: slug,
            spotify_id: spotifyArtist.id,
            image_url: spotifyArtist.images[0]?.url || null,
            genres: spotifyArtist.genres,
            popularity: spotifyArtist.popularity,
            followers: spotifyArtist.followers.total,
            spotify_url: spotifyArtist.external_urls.spotify,
            bio: `${spotifyArtist.name} is a ${spotifyArtist.genres.join(', ')} artist with ${spotifyArtist.followers.total.toLocaleString()} followers on Spotify.`,
            verified: spotifyArtist.popularity > 70,
          })
          .select('id, name, slug')
          .single();

        if (insertError) {
          console.error(`Failed to insert artist ${spotifyArtist.name}:`, insertError);
          continue;
        }

        if (result) {
          syncedArtists.push({
            id: result.id,
            name: result.name,
            slug: result.slug,
            spotifyId: spotifyArtist.id
          });
          
          console.log(`✅ Synced artist: ${spotifyArtist.name}`);
        }
        
      } catch (error) {
        console.error(`Failed to sync artist ${spotifyArtist.name}:`, error);
      }
    }

    return NextResponse.json({
      message: `Synced ${syncedArtists.length} artists from Spotify`,
      synced: syncedArtists.length,
      artists: syncedArtists
    });

  } catch (error) {
    console.error('Artist sync failed:', error);
    return NextResponse.json(
      { 
        error: 'Artist sync failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}