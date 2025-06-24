import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { artists, shows, venues, showArtists, showStatusEnum } from '@repo/database';
import { or, ilike, eq, desc, gte, and, sql } from 'drizzle-orm';
import { ticketmaster } from '@repo/external-apis';

interface SearchResult {
  id: string;
  type: 'artist' | 'show' | 'venue';
  title: string;
  subtitle?: string;
  meta?: string;
  imageUrl?: string;
  slug: string;
  spotifyId?: string;
}

// Helper function to create slug
function createSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Helper function to convert Ticketmaster attraction to artist
async function createArtistFromTicketmaster(attraction: any) {
  const artistData = {
    // For now, store Ticketmaster ID in external URLs since ticketmasterId field doesn't exist yet
    spotifyId: null, // We'll set this when we sync with Spotify later
    name: attraction.name,
    slug: createSlug(attraction.name),
    imageUrl: attraction.images?.[0]?.url || null,
    smallImageUrl: attraction.images?.find((img: any) => img.ratio === '4_3')?.url || attraction.images?.[1]?.url || null,
    genres: JSON.stringify(attraction.classifications?.map((c: any) => c.genre.name).filter(Boolean) || []),
    popularity: attraction.upcomingEvents?._total || 0,
    followers: 0, // Default for now
    externalUrls: JSON.stringify({ 
      ticketmaster: attraction.url,
      ticketmasterId: attraction.id // Store for reference
    }),
    lastSyncedAt: new Date(),
    verified: (attraction.upcomingEvents?._total || 0) > 0, // Verified if they have upcoming shows
  };

  try {
    // Check if artist already exists by name first
    const existingArtist = await db.query.artists.findFirst({
      where: eq(artists.name, attraction.name),
    });

    if (existingArtist) {
      // Update existing artist with Ticketmaster data
      const [updatedArtist] = await db
        .update(artists)
        .set({
          ...artistData,
          updatedAt: new Date(),
        })
        .where(eq(artists.id, existingArtist.id))
        .returning();

      if (updatedArtist) {
        await syncArtistShows(updatedArtist.id, attraction.name, attraction.id);
      }
      return updatedArtist;
    }

    const [newArtist] = await db
      .insert(artists)
      .values(artistData)
      .returning();

    // After creating artist, sync their shows from Ticketmaster
    if (newArtist) {
      await syncArtistShows(newArtist.id, attraction.name, attraction.id);
    }

    return newArtist;
  } catch (error) {
    console.error('Error creating artist:', error);
    return null;
  }
}

// Sync artist shows from Ticketmaster
async function syncArtistShows(artistId: string, artistName: string, ticketmasterArtistId: string) {
  try {
    const events = await ticketmaster.getUpcomingEvents(artistName, {
      size: 20,
      sort: 'date,asc'
    });

    for (const event of events) {
      if (event._embedded?.venues?.[0]) {
        const ticketmasterVenue = event._embedded.venues[0];
        
        // Create venue if it doesn't exist (check by name since no ticketmasterId field yet)
        let venue = await db.query.venues.findFirst({
          where: and(
            eq(venues.name, ticketmasterVenue.name),
            eq(venues.city, ticketmasterVenue.city.name)
          ),
        });

        if (!venue) {
          const venueData = {
            name: ticketmasterVenue.name,
            slug: createSlug(ticketmasterVenue.name),
            address: ticketmasterVenue.address?.line1 || null,
            city: ticketmasterVenue.city.name,
            state: ticketmasterVenue.state?.name || null,
            country: ticketmasterVenue.country.name,
            postalCode: null, // Not provided by Ticketmaster
            latitude: ticketmasterVenue.location?.latitude ? parseFloat(ticketmasterVenue.location.latitude) : null,
            longitude: ticketmasterVenue.location?.longitude ? parseFloat(ticketmasterVenue.location.longitude) : null,
            capacity: null, // Not provided by Ticketmaster
            website: ticketmasterVenue.url,
            timezone: ticketmasterVenue.timezone || 'UTC',
          };

          const [newVenue] = await db
            .insert(venues)
            .values(venueData)
            .returning();
          
          venue = newVenue;
        }

        // Create show
        const showData = {
          ticketmasterId: event.id,
          name: event.name,
          slug: createSlug(event.name),
          date: event.dates.start.localDate,
          startTime: event.dates.start.localTime || null,
          venueId: venue?.id || null,
          headlinerArtistId: artistId,
          description: null,
          ticketUrl: event.url,
          status: 'upcoming' as const, // Use const assertion for proper typing
        };

        const [show] = await db
          .insert(shows)
          .values(showData)
          .onConflictDoUpdate({
            target: shows.ticketmasterId,
            set: {
              ...showData,
              updatedAt: new Date(),
            },
          })
          .returning();

        // Link artist to show
        if (show) {
          await db
            .insert(showArtists)
            .values({
              showId: show.id,
              artistId: artistId,
              orderIndex: 0, // 0 = headliner
              isHeadliner: true,
            })
            .onConflictDoNothing();
        }
      }
    }
  } catch (error) {
    console.error('Error syncing artist shows:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    if (!q || q.length < 2) {
      return NextResponse.json({ artists: [], shows: [], venues: [] });
    }

    const query = q.toLowerCase();
    
    // Initialize result arrays
    const artistResults: any[] = [];
    const showResults: any[] = [];
    const venueResults: any[] = [];

    // Search local database first for fast results
    try {
      // Search artists in database
      const dbArtists = await db
        .select({
          artist: artists,
          showCount: sql<number>`(
            SELECT COUNT(DISTINCT sa.show_id)
            FROM show_artists sa
            WHERE sa.artist_id = ${artists.id}
          )`,
          followerCount: sql<number>`(
            SELECT COUNT(*)
            FROM user_follows_artists ufa
            WHERE ufa.artist_id = ${artists.id}
          )`
        })
        .from(artists)
        .where(ilike(artists.name, `%${query}%`))
        .limit(10);

      for (const { artist, showCount, followerCount } of dbArtists) {
        const genres = artist.genres ? JSON.parse(artist.genres as string) : [];
        artistResults.push({
          id: artist.id,
          name: artist.name,
          slug: artist.slug,
          imageUrl: artist.imageUrl || undefined,
          genres: genres,
          popularity: artist.popularity || 0,
          showCount: showCount || 0,
          followerCount: followerCount || 0,
          isFollowing: false, // Will be updated on client-side
        });
      }

      // Search shows in database
      const dbShows = await db
        .select({
          show: shows,
          artist: artists,
          venue: venues,
        })
        .from(shows)
        .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
        .leftJoin(venues, eq(shows.venueId, venues.id))
        .where(
          and(
            or(
              ilike(shows.name, `%${query}%`),
              ilike(artists.name, `%${query}%`)
            ),
            gte(shows.date, new Date().toISOString())
          )
        )
        .orderBy(shows.date)
        .limit(10);

      for (const { show, artist, venue } of dbShows) {
        if (venue) {
          showResults.push({
            id: show.id,
            date: show.date,
            status: show.ticketUrl ? 'on_sale' : 'upcoming',
            ticketmasterUrl: show.ticketUrl,
            artist: {
              name: artist.name,
              slug: artist.slug,
            },
            venue: {
              name: venue.name,
              slug: venue.slug,
              city: venue.city,
              state: venue.state || '',
            },
          });
        }
      }

      // Search venues in database
      const dbVenues = await db
        .select({
          venue: venues,
          showCount: sql<number>`(
            SELECT COUNT(*)
            FROM shows s
            WHERE s.venue_id = ${venues.id}
          )`
        })
        .from(venues)
        .where(
          or(
            ilike(venues.name, `%${query}%`),
            ilike(venues.city, `%${query}%`)
          )
        )
        .limit(10);

      for (const { venue, showCount } of dbVenues) {
        venueResults.push({
          id: venue.id,
          name: venue.name,
          slug: venue.slug,
          city: venue.city,
          state: venue.state || '',
          capacity: venue.capacity,
          showCount: showCount || 0,
        });
      }
    } catch (dbError) {
      console.error('Database search error:', dbError);
    }

    // If we don't have many artist results, search Ticketmaster for new artists
    if (artistResults.length < 3) {
      try {
        const ticketmasterResults = await ticketmaster.searchAttractions({
          keyword: q,
          size: 10,
          classificationName: ['Music']
        });

        if (ticketmasterResults._embedded?.attractions) {
          for (const attraction of ticketmasterResults._embedded.attractions.slice(0, 5)) {
            // Check if we already have this artist by name
            const existingIndex = artistResults.findIndex(a => 
              a.name.toLowerCase() === attraction.name.toLowerCase()
            );

            if (existingIndex === -1) {
              // Create new artist and sync their data
              const newArtist = await createArtistFromTicketmaster(attraction);
              
              if (newArtist) {
                const genres = newArtist.genres ? JSON.parse(newArtist.genres as string) : [];
                artistResults.push({
                  id: newArtist.id,
                  name: newArtist.name,
                  slug: newArtist.slug,
                  imageUrl: newArtist.imageUrl || undefined,
                  genres: genres,
                  popularity: newArtist.popularity || 0,
                  showCount: 0, // Will be populated after sync
                  followerCount: 0,
                  isFollowing: false,
                });
              }
            }
          }
        }
      } catch (ticketmasterError) {
        console.error('Ticketmaster search error:', ticketmasterError);
      }
    }

    // Sort results by relevance
    const sortedArtists = artistResults.sort((a, b) => {
      // Exact matches first
      const aExact = a.name.toLowerCase() === q.toLowerCase();
      const bExact = b.name.toLowerCase() === q.toLowerCase();
      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;
      
      // Then by popularity/followers
      return (b.followerCount + b.showCount) - (a.followerCount + a.showCount);
    });

    return NextResponse.json({
      artists: sortedArtists.slice(0, limit),
      shows: showResults.slice(0, limit),
      venues: venueResults.slice(0, limit),
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}