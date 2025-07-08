import { artists, db, sql } from '@repo/database';
import { TicketmasterClient } from '@repo/external-apis';
import { type NextRequest, NextResponse } from 'next/server';

// Simple Spotify client for search
class SpotifySearchClient {
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  async authenticate(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return;
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env['SPOTIFY_CLIENT_ID']}:${process.env['SPOTIFY_CLIENT_SECRET']}`
          ).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error('Spotify authentication failed');
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;
    } catch (error) {
      console.error('Spotify auth error:', error);
      throw error;
    }
  }

  async searchArtists(query: string, limit = 5): Promise<any[]> {
    try {
      await this.authenticate();

      const params = new URLSearchParams({
        q: query,
        type: 'artist',
        limit: limit.toString(),
      });

      const response = await fetch(
        `https://api.spotify.com/v1/search?${params}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Spotify search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.artists?.items || [];
    } catch (error) {
      console.error('Spotify search error:', error);
      return [];
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ artists: [] });
    }

    // Search in database first
    const dbArtists = await db
      .select({
        id: artists.slug,
        name: artists.name,
        imageUrl: artists.imageUrl,
        genres: artists.genres,
        spotifyId: artists.spotifyId,
        popularity: artists.popularity,
      })
      .from(artists)
      .where(
        sql`(${artists.name} ILIKE ${'%' + query + '%'} OR coalesce(${artists.genres}, '') ILIKE ${'%' + query + '%'})`
      )
      .limit(10);

    // Format database results
    const dbResults = dbArtists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      imageUrl: artist.imageUrl || undefined,
      genres: artist.genres ? JSON.parse(artist.genres) : [],
      source: 'database' as const,
      spotifyId: artist.spotifyId || undefined,
      popularity: artist.popularity || 0,
    }));

    // Keep track of artist names we already have
    const existingNames = new Set(dbResults.map((a) => a.name.toLowerCase()));

    // Search external sources if we have less than 10 results
    let externalResults: any[] = [];

    if (dbResults.length < 10) {
      // Try Spotify search first
      try {
        if (
          process.env['SPOTIFY_CLIENT_ID'] &&
          process.env['SPOTIFY_CLIENT_SECRET']
        ) {
          const spotify = new SpotifySearchClient();
          const spotifyArtists = await spotify.searchArtists(query, 5);

          const spotifyResults = spotifyArtists
            .filter(
              (artist: any) => !existingNames.has(artist.name.toLowerCase())
            )
            .map((artist: any) => ({
              id: artist.id,
              name: artist.name,
              imageUrl: artist.images?.[0]?.url,
              genres: artist.genres || [],
              source: 'spotify' as const,
              spotifyId: artist.id,
              popularity: artist.popularity || 0,
              followers: artist.followers?.total || 0,
            }));

          externalResults = [...externalResults, ...spotifyResults];

          // Add to existing names set
          spotifyResults.forEach((r) =>
            existingNames.add(r.name.toLowerCase())
          );
        }
      } catch (error) {
        console.error('Spotify search failed:', error);
      }

      // Try Ticketmaster search
      try {
        if (
          process.env['TICKETMASTER_API_KEY'] &&
          externalResults.length + dbResults.length < 10
        ) {
          const tmClient = new TicketmasterClient({});
          const tmResponse = await tmClient.searchAttractions({
            keyword: query,
            size: 10 - dbResults.length - externalResults.length,
            classificationName: 'Music',
          });

          if (tmResponse._embedded?.attractions) {
            const tmResults = tmResponse._embedded.attractions
              .filter(
                (attraction: any) =>
                  !existingNames.has(attraction.name.toLowerCase())
              )
              .map((attraction: any) => ({
                id: attraction.id,
                name: attraction.name,
                imageUrl: attraction.images?.[0]?.url,
                genres: attraction.classifications?.[0]?.genre
                  ? [attraction.classifications[0].genre.name]
                  : [],
                source: 'ticketmaster' as const,
                ticketmasterId: attraction.id,
              }));

            externalResults = [...externalResults, ...tmResults];
          }
        }
      } catch (error) {
        console.error('Ticketmaster search failed:', error);
      }
    }

    // Combine results, database first
    const combinedResults = [...dbResults, ...externalResults];

    return NextResponse.json({ artists: combinedResults });
  } catch (error) {
    console.error('Artist search error:', error);
    return NextResponse.json(
      { error: 'Failed to search artists' },
      { status: 500 }
    );
  }
}
