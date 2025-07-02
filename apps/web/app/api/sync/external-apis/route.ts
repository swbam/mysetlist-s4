import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { artists, shows, venues, setlists, setlistSongs, songs } from '@repo/database';
import { eq } from 'drizzle-orm';

// Spotify API Client
class SpotifyClient {
  private accessToken?: string;

  async authenticate() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Spotify authentication failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
  }

  async searchArtists(query: string, limit = 20) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify search failed: ${response.status}`);
    }

    return response.json();
  }

  async getArtist(artistId: string) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify artist fetch failed: ${response.status}`);
    }

    return response.json();
  }
}

// Ticketmaster API Client
class TicketmasterClient {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      throw new Error('Ticketmaster API key not configured');
    }
    this.apiKey = apiKey;
  }

  async searchEvents(options: {
    keyword?: string;
    city?: string;
    stateCode?: string;
    countryCode?: string;
    startDateTime?: string;
    endDateTime?: string;
    size?: number;
    page?: number;
  }) {
    const params = new URLSearchParams();
    params.append('apikey', this.apiKey);
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params}`
    );

    if (!response.ok) {
      throw new Error(`Ticketmaster search failed: ${response.status}`);
    }

    return response.json();
  }

  async getEvent(eventId: string) {
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json?apikey=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Ticketmaster event fetch failed: ${response.status}`);
    }

    return response.json();
  }
}

// Setlist.fm API Client
class SetlistFmClient {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.SETLISTFM_API_KEY;
    if (!apiKey) {
      throw new Error('Setlist.fm API key not configured');
    }
    this.apiKey = apiKey;
  }

  async searchArtists(artistName: string, page = 1) {
    const response = await fetch(
      `https://api.setlist.fm/rest/1.0/search/artists?artistName=${encodeURIComponent(artistName)}&p=${page}`,
      {
        headers: {
          'x-api-key': this.apiKey,
          'Accept': 'application/json',
          'User-Agent': 'MySetlist/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Setlist.fm artist search failed: ${response.status}`);
    }

    return response.json();
  }

  async searchSetlists(options: {
    artistName?: string;
    artistMbid?: string;
    venueName?: string;
    cityName?: string;
    date?: string;
    year?: number;
    p?: number;
  }) {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(
      `https://api.setlist.fm/rest/1.0/search/setlists?${params}`,
      {
        headers: {
          'x-api-key': this.apiKey,
          'Accept': 'application/json',
          'User-Agent': 'MySetlist/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Setlist.fm setlist search failed: ${response.status}`);
    }

    return response.json();
  }

  async getSetlist(setlistId: string) {
    const response = await fetch(
      `https://api.setlist.fm/rest/1.0/setlist/${setlistId}`,
      {
        headers: {
          'x-api-key': this.apiKey,
          'Accept': 'application/json',
          'User-Agent': 'MySetlist/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Setlist.fm setlist fetch failed: ${response.status}`);
    }

    return response.json();
  }
}

// Sync Services
class ArtistSyncService {
  private spotifyClient: SpotifyClient;

  constructor() {
    this.spotifyClient = new SpotifyClient();
  }

  async syncArtistFromSpotify(spotifyId: string) {
    await this.spotifyClient.authenticate();
    const spotifyArtist = await this.spotifyClient.getArtist(spotifyId);

    const artistData = {
      spotifyId: spotifyArtist.id,
      name: spotifyArtist.name,
      slug: this.generateSlug(spotifyArtist.name),
      imageUrl: spotifyArtist.images[0]?.url || null,
      smallImageUrl: spotifyArtist.images[2]?.url || null,
      genres: JSON.stringify(spotifyArtist.genres),
      popularity: spotifyArtist.popularity,
      followers: spotifyArtist.followers.total,
      externalUrls: JSON.stringify(spotifyArtist.external_urls),
      lastSyncedAt: new Date(),
    };

    try {
      const [artist] = await db
        .insert(artists)
        .values(artistData)
        .onConflictDoUpdate({
          target: artists.spotifyId,
          set: {
            ...artistData,
            updatedAt: new Date(),
          },
        })
        .returning();

      return artist;
    } catch (error) {
      console.error('Failed to sync artist:', error);
      throw error;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}

class ShowSyncService {
  private ticketmasterClient: TicketmasterClient;

  constructor() {
    this.ticketmasterClient = new TicketmasterClient();
  }

  async syncUpcomingShows(options: { city?: string; stateCode?: string; limit?: number } = {}) {
    const now = new Date();
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year ahead

    const events = await this.ticketmasterClient.searchEvents({
      startDateTime: now.toISOString(),
      endDateTime: futureDate.toISOString(),
      size: options.limit || 200,
      countryCode: 'US',
      city: options.city,
      stateCode: options.stateCode,
    });

    const results = [];
    if (events._embedded?.events) {
      for (const event of events._embedded.events) {
        try {
          const syncedShow = await this.syncShow(event);
          if (syncedShow) {
            results.push(syncedShow);
          }
        } catch (error) {
          console.error(`Failed to sync show ${event.id}:`, error);
        }
      }
    }

    return results;
  }

  private async syncShow(tmEvent: any) {
    try {
      // Sync venue first
      let venue = null;
      if (tmEvent._embedded?.venues?.[0]) {
        venue = await this.syncVenue(tmEvent._embedded.venues[0]);
      }

      // Find or create artist
      const artist = await this.findOrCreateArtist(tmEvent);

      // Create or update show
      const showData = {
        ticketmasterId: tmEvent.id,
        headlinerArtistId: artist.id,
        venueId: venue?.id || null,
        name: tmEvent.name,
        slug: this.generateSlug(tmEvent.name),
        date: new Date(tmEvent.dates.start.localDate),
        startTime: tmEvent.dates.start.localTime || null,
        status: this.mapEventStatus(tmEvent.dates.status.code),
        ticketUrl: tmEvent.url,
        minPrice: tmEvent.priceRanges?.[0]?.min || null,
        maxPrice: tmEvent.priceRanges?.[0]?.max || null,
        currency: tmEvent.priceRanges?.[0]?.currency || 'USD',
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

      return show;
    } catch (error) {
      console.error(`Failed to sync show ${tmEvent.id}:`, error);
      return null;
    }
  }

  private async syncVenue(tmVenue: any) {
    const venueData = {
      ticketmasterId: tmVenue.id,
      name: tmVenue.name,
      slug: this.generateSlug(tmVenue.name),
      address: tmVenue.address?.line1 || null,
      city: tmVenue.city?.name || null,
      state: tmVenue.state?.stateCode || null,
      country: tmVenue.country?.countryCode || null,
      postalCode: tmVenue.postalCode || null,
      latitude: tmVenue.location?.latitude ? parseFloat(tmVenue.location.latitude) : null,
      longitude: tmVenue.location?.longitude ? parseFloat(tmVenue.location.longitude) : null,
      timezone: tmVenue.timezone || null,
      capacity: tmVenue.capacity || null,
      website: tmVenue.url || null,
    };

    try {
      const [venue] = await db
        .insert(venues)
        .values(venueData)
        .onConflictDoUpdate({
          target: venues.ticketmasterId,
          set: {
            ...venueData,
            updatedAt: new Date(),
          },
        })
        .returning();

      return venue;
    } catch (error) {
      console.error('Failed to sync venue:', error);
      return null;
    }
  }

  private async findOrCreateArtist(tmEvent: any) {
    const attractionName = tmEvent._embedded?.attractions?.[0]?.name || tmEvent.name;
    
    let artist = await db.query.artists.findFirst({
      where: eq(artists.name, attractionName),
    });

    if (!artist) {
      const [newArtist] = await db
        .insert(artists)
        .values({
          name: attractionName,
          slug: this.generateSlug(attractionName),
          verified: false,
        })
        .returning();
      
      artist = newArtist;
    }

    return artist;
  }

  private mapEventStatus(statusCode: string): 'upcoming' | 'cancelled' | 'completed' {
    switch (statusCode) {
      case 'onsale':
      case 'offsale':
        return 'upcoming';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'upcoming';
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}

class SetlistSyncService {
  private setlistFmClient: SetlistFmClient;

  constructor() {
    this.setlistFmClient = new SetlistFmClient();
  }

  async syncSetlistsForArtist(artistName: string, maxPages = 5) {
    const results = [];
    
    for (let page = 1; page <= maxPages; page++) {
      try {
        const response = await this.setlistFmClient.searchSetlists({
          artistName,
          p: page
        });

        if (response.setlist && response.setlist.length > 0) {
          for (const setlistData of response.setlist) {
            try {
              const syncedSetlist = await this.syncSetlist(setlistData);
              if (syncedSetlist) {
                results.push(syncedSetlist);
              }
            } catch (error) {
              console.error(`Failed to sync setlist ${setlistData.id}:`, error);
            }
          }
        } else {
          break; // No more setlists
        }

        // Rate limiting: wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to fetch setlists page ${page}:`, error);
        break;
      }
    }

    return results;
  }

  private async syncSetlist(setlistData: any) {
    try {
      // Find or create artist
      const artist = await this.findOrCreateArtist(setlistData.artist);
      
      // Find or create venue
      const venue = await this.findOrCreateVenue(setlistData.venue);

      // Create or update setlist
      const setlistRecord = {
        setlistfmId: setlistData.id,
        artistId: artist.id,
        venueId: venue.id,
        eventDate: new Date(setlistData.eventDate),
        tourName: setlistData.tour?.name || null,
        info: setlistData.info || null,
        lastUpdated: new Date(setlistData.lastUpdated),
      };

      const [setlist] = await db
        .insert(setlists)
        .values(setlistRecord)
        .onConflictDoUpdate({
          target: setlists.setlistfmId,
          set: {
            ...setlistRecord,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Sync songs
      await this.syncSetlistSongs(setlist.id, setlistData.sets);

      return setlist;
    } catch (error) {
      console.error(`Failed to sync setlist ${setlistData.id}:`, error);
      return null;
    }
  }

  private async syncSetlistSongs(setlistId: string, sets: any) {
    // Clear existing songs for this setlist
    await db.delete(setlistSongs).where(eq(setlistSongs.setlistId, setlistId));

    let position = 1;
    
    for (const set of sets.set) {
      for (const song of set.song) {
        if (song.name && song.name.trim()) {
          await db.insert(setlistSongs).values({
            setlistId,
            songName: song.name,
            position,
            isEncore: set.encore ? true : false,
            info: song.info || null,
            isTape: song.tape || false,
            coverArtist: song.cover?.name || null,
          });
          position++;
        }
      }
    }
  }

  private async findOrCreateArtist(artistData: any) {
    let artist = await db.query.artists.findFirst({
      where: eq(artists.name, artistData.name),
    });

    if (!artist) {
      const [newArtist] = await db
        .insert(artists)
        .values({
          name: artistData.name,
          slug: this.generateSlug(artistData.name),
          setlistfmMbid: artistData.mbid,
          verified: false,
        })
        .returning();
      
      artist = newArtist;
    }

    return artist;
  }

  private async findOrCreateVenue(venueData: any) {
    let venue = await db.query.venues.findFirst({
      where: eq(venues.name, venueData.name),
    });

    if (!venue) {
      const [newVenue] = await db
        .insert(venues)
        .values({
          name: venueData.name,
          slug: this.generateSlug(venueData.name),
          city: venueData.city.name,
          state: venueData.city.stateCode || null,
          country: venueData.city.country.code,
          latitude: venueData.city.coords?.lat || null,
          longitude: venueData.city.coords?.long || null,
        })
        .returning();
      
      venue = newVenue;
    }

    return venue;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}

// Main sync handler
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'test';
    const artistName = searchParams.get('artist') || 'Taylor Swift';
    const city = searchParams.get('city');
    const state = searchParams.get('state');

    const results: any = {
      action,
      timestamp: new Date().toISOString(),
      results: {},
    };

    switch (action) {
      case 'sync-artist':
        const artistSync = new ArtistSyncService();
        const spotifyClient = new SpotifyClient();
        
        // Search for artist on Spotify first
        const searchResults = await spotifyClient.searchArtists(artistName, 1);
        if (searchResults.artists.items.length > 0) {
          const artist = await artistSync.syncArtistFromSpotify(searchResults.artists.items[0].id);
          results.results.artist = artist;
        }
        break;

      case 'sync-shows':
        const showSync = new ShowSyncService();
        const shows = await showSync.syncUpcomingShows({ city, stateCode: state, limit: 50 });
        results.results.shows = shows;
        break;

      case 'sync-setlists':
        const setlistSync = new SetlistSyncService();
        const setlists = await setlistSync.syncSetlistsForArtist(artistName, 3);
        results.results.setlists = setlists;
        break;

      case 'test':
      default:
        // Test all APIs
        const spotifyTest = new SpotifyClient();
        const ticketmasterTest = new TicketmasterClient();
        const setlistfmTest = new SetlistFmClient();

        const [spotifyResult, ticketmasterResult, setlistfmResult] = await Promise.allSettled([
          spotifyTest.searchArtists(artistName, 5),
          ticketmasterTest.searchEvents({ keyword: artistName, size: 5 }),
          setlistfmTest.searchArtists(artistName, 1),
        ]);

        results.results = {
          spotify: spotifyResult.status === 'fulfilled' ? {
            success: true,
            artistCount: spotifyResult.value.artists.items.length,
            artists: spotifyResult.value.artists.items.slice(0, 3).map((a: any) => ({
              name: a.name,
              popularity: a.popularity,
              followers: a.followers.total
            }))
          } : {
            success: false,
            error: spotifyResult.reason?.message
          },
          ticketmaster: ticketmasterResult.status === 'fulfilled' ? {
            success: true,
            eventCount: ticketmasterResult.value._embedded?.events?.length || 0,
            events: ticketmasterResult.value._embedded?.events?.slice(0, 3).map((e: any) => ({
              name: e.name,
              date: e.dates.start.localDate,
              venue: e._embedded?.venues?.[0]?.name
            })) || []
          } : {
            success: false,
            error: ticketmasterResult.reason?.message
          },
          setlistfm: setlistfmResult.status === 'fulfilled' ? {
            success: true,
            artistCount: setlistfmResult.value.artist?.length || 0,
            artists: setlistfmResult.value.artist?.slice(0, 3).map((a: any) => ({
              name: a.name,
              mbid: a.mbid
            })) || []
          } : {
            success: false,
            error: setlistfmResult.reason?.message
          }
        };
        break;
    }

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Sync failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}