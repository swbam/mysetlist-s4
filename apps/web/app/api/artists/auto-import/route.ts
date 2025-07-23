import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '~/lib/supabase/server';

interface AutoImportRequest {
  artistId?: string;
  artistName?: string;
  spotifyId?: string;
}

/**
 * Automated artist data import handler
 * Triggers comprehensive data sync when user interacts with an artist
 */
export async function POST(request: NextRequest) {
  try {
    const body: AutoImportRequest = await request.json();
    const { artistId, artistName, spotifyId } = body;

    if (!artistId && !artistName && !spotifyId) {
      return NextResponse.json(
        { error: 'Either artistId, artistName, or spotifyId is required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // Find or create artist
    let artist;

    if (artistId) {
      // Look up by ID
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .single();

      artist = existingArtist;
    } else if (spotifyId) {
      // Look up by Spotify ID
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('*')
        .eq('spotify_id', spotifyId)
        .single();

      artist = existingArtist;
    } else if (artistName) {
      // Look up by name
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('*')
        .eq('name', artistName)
        .single();

      artist = existingArtist;
    }

    // If artist doesn't exist, create it
    if (!artist) {
      // Import external APIs for artist creation
      const { SpotifyClient, TicketmasterClient } = await import('@repo/external-apis');
      
      let spotifyData = null;
      let ticketmasterData = null;
      
      // Try to get data from Spotify if we have a Spotify ID or name
      if ((spotifyId || artistName) && process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
        try {
          const spotify = new SpotifyClient({});
          await spotify.authenticate();
          
          if (spotifyId) {
            spotifyData = await spotify.getArtist(spotifyId);
          } else if (artistName) {
            const searchResults = await spotify.searchArtists(artistName, 1);
            if (searchResults.artists.items.length > 0) {
              spotifyData = searchResults.artists.items[0];
            }
          }
        } catch (error) {
          console.warn('Spotify fetch failed:', error);
        }
      }
      
      // Try to get data from Ticketmaster if we have artist name
      if (artistName && process.env.TICKETMASTER_API_KEY) {
        try {
          const ticketmaster = new TicketmasterClient();
          const searchResults = await ticketmaster.searchAttractions({
            keyword: artistName,
            size: 1,
            classificationName: ['music'],
          });
          
          if (searchResults._embedded?.attractions?.length > 0) {
            ticketmasterData = searchResults._embedded.attractions[0];
          }
        } catch (error) {
          console.warn('Ticketmaster search failed:', error);
        }
      }
      
      // Create the artist with whatever data we have
      const artistSlug = (artistName || spotifyData?.name || ticketmasterData?.name || 'unknown')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
        
      const { data: newArtist, error: createError } = await supabase
        .from('artists')
        .insert({
          name: artistName || spotifyData?.name || ticketmasterData?.name || 'Unknown Artist',
          slug: artistSlug,
          spotify_id: spotifyData?.id || spotifyId || null,
          ticketmaster_id: ticketmasterData?.id || null,
          image_url: spotifyData?.images?.[0]?.url || ticketmasterData?.images?.[0]?.url || null,
          small_image_url: spotifyData?.images?.[2]?.url || null,
          genres: spotifyData?.genres || ticketmasterData?.classifications?.map(c => c.genre?.name).filter(Boolean) || [],
          popularity: spotifyData?.popularity || 0,
          followers: spotifyData?.followers?.total || 0,
          verified: (spotifyData?.followers?.total || 0) > 100000,
          external_urls: {
            spotify: spotifyData?.external_urls?.spotify || null,
            ticketmaster: ticketmasterData?.url || null,
          },
          trending_score: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        })
        .select()
        .single();
        
      if (createError) {
        console.error('Failed to create artist:', createError);
        return NextResponse.json(
          { error: 'Failed to create artist', details: createError.message },
          { status: 500 }
        );
      }
      
      artist = newArtist;
    }

    // Check if we need to sync data (only if not synced in last 24 hours)
    const needsSync =
      !artist.last_synced_at ||
      new Date(artist.last_synced_at) <
        new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours

    if (needsSync) {
      // Update last synced timestamp first to prevent duplicate syncs
      await supabase
        .from('artists')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', artist.id);

      // Trigger background sync for shows and additional data
      setImmediate(async () => {
        try {
          // If we have a Ticketmaster ID, sync shows
          if (artist.ticketmaster_id) {
            await fetch(`${process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3001'}/api/artists/sync-shows`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                artistId: artist.id,
              }),
            });
          }
        } catch (_error) {}
      });
    }

    // Get current data stats
    const { count: showCount } = await supabase
      .from('shows')
      .select('*', { count: 'exact', head: true })
      .eq('headliner_artist_id', artist.id);

    const { count: songCount } = await supabase
      .from('artist_songs')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', artist.id);

    // Helper function to safely parse genres
    const parseGenres = (genresField: string | string[] | null): string[] => {
      if (!genresField) return [];
      
      if (Array.isArray(genresField)) {
        return genresField;
      }
      
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(genresField);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // If JSON parsing fails, treat as comma-separated string
        return genresField
          .split(',')
          .map((genre) => genre.trim())
          .filter((genre) => genre.length > 0);
      }
    };

    return NextResponse.json({
      success: true,
      artist: {
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        spotifyId: artist.spotify_id,
        ticketmasterId: artist.ticketmaster_id,
        imageUrl: artist.image_url,
        genres: parseGenres(artist.genres),
        popularity: artist.popularity,
        followers: artist.followers,
        verified: artist.verified,
      },
      stats: {
        showCount: showCount || 0,
        songCount: songCount || 0,
        totalAlbums: artist.total_albums || 0,
        totalSongs: artist.total_songs || 0,
        lastSyncedAt: artist.last_synced_at,
        lastFullSyncAt: artist.last_full_sync_at,
        songCatalogSyncedAt: artist.song_catalog_synced_at,
        syncTriggered: needsSync,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to auto-import artist data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
