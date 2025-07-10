// @ts-nocheck
import { db } from '@repo/database';
import {
  artistSongs,
  artistStats,
  artists,
  setlistSongs,
  setlists,
  showArtists,
  shows,
  songs,
  venues,
} from '@repo/database';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { SyncProgressTracker } from '~/lib/sync-progress-tracker';

// Rate limiting and caching utilities
export class RateLimiter {
  private static requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  static async checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<boolean> {
    const now = Date.now();
    const current = RateLimiter.requestCounts.get(key);

    if (!current || now > current.resetTime) {
      RateLimiter.requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (current.count >= maxRequests) {
      return false;
    }

    current.count++;
    return true;
  }

  static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Spotify API Client
export class SpotifyClient {
  private accessToken?: string;
  private tokenExpiry?: number;

  async authenticate() {
    const clientId = process.env['SPOTIFY_CLIENT_ID'];
    const clientSecret = process.env['SPOTIFY_CLIENT_SECRET'];

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Spotify authentication failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000; // 1 minute buffer
  }

  private async ensureValidToken() {
    if (
      !this.accessToken ||
      !this.tokenExpiry ||
      Date.now() > this.tokenExpiry
    ) {
      await this.authenticate();
    }
  }

  async searchArtists(query: string, limit = 20) {
    await this.ensureValidToken();

    if (!(await RateLimiter.checkLimit('spotify', 90, 60000))) {
      await RateLimiter.delay(1000);
    }

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify search failed: ${response.status}`);
    }

    return response.json();
  }

  async getArtist(artistId: string) {
    await this.ensureValidToken();

    if (!(await RateLimiter.checkLimit('spotify', 90, 60000))) {
      await RateLimiter.delay(1000);
    }

    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify artist fetch failed: ${response.status}`);
    }

    return response.json();
  }

  async getArtistTopTracks(artistId: string, market = 'US') {
    await this.ensureValidToken();

    if (!(await RateLimiter.checkLimit('spotify', 90, 60000))) {
      await RateLimiter.delay(1000);
    }

    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Spotify top tracks fetch failed: ${response.status}`);
    }

    return response.json();
  }
}

// Ticketmaster API Client
export class TicketmasterClient {
  private apiKey: string;

  constructor() {
    const apiKey = process.env['TICKETMASTER_API_KEY'];
    if (!apiKey) {
      throw new Error('Ticketmaster API key not configured');
    }
    this.apiKey = apiKey;
  }

  async searchEvents(options: {
    keyword?: string;
    attractionId?: string;
    city?: string;
    stateCode?: string;
    countryCode?: string;
    startDateTime?: string;
    endDateTime?: string;
    size?: number;
    page?: number;
  }) {
    if (!(await RateLimiter.checkLimit('ticketmaster', 200, 3600000))) {
      // 200 per hour
      await RateLimiter.delay(2000);
    }

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

  async getAttraction(attractionId: string) {
    if (!(await RateLimiter.checkLimit('ticketmaster', 200, 3600000))) {
      await RateLimiter.delay(2000);
    }

    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/attractions/${attractionId}.json?apikey=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(
        `Ticketmaster attraction fetch failed: ${response.status}`
      );
    }

    return response.json();
  }
}

// Setlist.fm API Client
export class SetlistFmClient {
  private apiKey: string;

  constructor() {
    const apiKey = process.env['SETLISTFM_API_KEY'];
    if (!apiKey) {
      throw new Error('Setlist.fm API key not configured');
    }
    this.apiKey = apiKey;
  }

  async searchSetlists(options: {
    artistName?: string;
    artistMbid?: string;
    p?: number;
  }) {
    if (!(await RateLimiter.checkLimit('setlistfm', 1, 1100))) {
      await RateLimiter.delay(1100);
    }

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
          Accept: 'application/json',
          'User-Agent': 'MySetlist/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Setlist.fm setlist search failed: ${response.status}`);
    }

    return response.json();
  }

  async findArtistMbid(artistName: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://api.setlist.fm/rest/1.0/search/artists?artistName=${encodeURIComponent(artistName)}&p=1&sort=relevance`,
        {
          headers: {
            'x-api-key': this.apiKey,
            Accept: 'application/json',
            'User-Agent': 'MySetlist/1.0',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.artist?.[0]?.mbid || null;
    } catch {
      return null;
    }
  }

  async getRecentSetlists(mbid: string, days = 30): Promise<any[]> {
    const setlists: any[] = [];
    let page = 1;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    try {
      while (page <= 5) {
        // Limit to 5 pages
        const response = await this.searchSetlists({
          artistMbid: mbid,
          p: page,
        });

        if (!response.setlist || response.setlist.length === 0) {
          break;
        }

        for (const setlist of response.setlist) {
          const eventDate = new Date(setlist.eventDate);
          if (eventDate < cutoffDate) {
            return setlists; // Stop when we hit older dates
          }
          setlists.push(setlist);
        }

        if (response.page >= response.itemsPerPage) {
          break;
        }
        page++;

        await RateLimiter.delay(1100);
      }
    } catch (_error) {}

    return setlists;
  }

  formatSetlistForDb(setlistData: any) {
    const songs: any[] = [];
    let position = 1;

    // Process each set (main set, encore, etc.)
    if (setlistData.sets?.set) {
      for (const set of setlistData.sets.set) {
        for (const song of set.song || []) {
          songs.push({
            name: song.name,
            position,
            setName:
              set.name || (set.encore ? `Encore ${set.encore}` : 'Main Set'),
          });
          position++;
        }
      }
    }

    return {
      id: setlistData.id,
      eventDate: setlistData.eventDate,
      venue: {
        name: setlistData.venue?.name || 'Unknown Venue',
        city: setlistData.venue?.city?.name || 'Unknown City',
        state: setlistData.venue?.city?.stateCode || null,
        country: setlistData.venue?.city?.country?.code || null,
        latitude: setlistData.venue?.city?.coords?.lat || null,
        longitude: setlistData.venue?.city?.coords?.long || null,
      },
      songs,
    };
  }
}

// Unified Sync Service
export class UnifiedSyncService {
  private spotifyClient: SpotifyClient;
  private ticketmasterClient: TicketmasterClient;
  private setlistFmClient: SetlistFmClient | null;
  private progressTracker: SyncProgressTracker;

  constructor() {
    this.spotifyClient = new SpotifyClient();
    this.ticketmasterClient = new TicketmasterClient();
    this.setlistFmClient = process.env['SETLISTFM_API_KEY'] ? new SetlistFmClient() : null;
    this.progressTracker = new SyncProgressTracker();
  }

  async syncArtistCatalog(artistId: string) {
    const results = {
      artist: { updated: false, data: null as any },
      songs: { synced: 0, errors: 0 },
      shows: { synced: 0, errors: 0 },
      venues: { synced: 0, errors: 0 },
      setlists: { synced: 0, errors: 0 },
      stats: { calculated: false },
    };

    try {
      // Get artist from database
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      if (!artist) {
        throw new Error('Artist not found');
      }

      results.artist.data = artist;

      // Start progress tracking
      await this.progressTracker.startSync(artistId, artist.name);

      // Sync Spotify data if available
      if (artist.spotifyId) {
        try {
          const spotifyArtist = await this.spotifyClient.getArtist(
            artist.spotifyId
          );

          // Update artist with latest Spotify data
          await db
            .update(artists)
            .set({
              imageUrl: spotifyArtist.images[0]?.url || artist.imageUrl,
              smallImageUrl:
                spotifyArtist.images[2]?.url || artist.smallImageUrl,
              genres: JSON.stringify(spotifyArtist.genres),
              popularity: spotifyArtist.popularity,
              followers: spotifyArtist.followers.total,
              externalUrls: JSON.stringify(spotifyArtist.external_urls),
              lastSyncedAt: new Date(),
            })
            .where(eq(artists.id, artistId));

          results.artist.updated = true;

          // Update progress
          await this.progressTracker.updateProgress(artistId, {
            currentStep: 'Syncing songs from Spotify',
            completedSteps: 1,
          });

          // Sync top tracks
          const topTracks = await this.spotifyClient.getArtistTopTracks(
            artist.spotifyId
          );

          for (const track of topTracks.tracks) {
            try {
              const existingSong = await db
                .select()
                .from(songs)
                .where(
                  and(
                    eq(songs.spotifyId, track.id),
                    eq(songs.artist, artistId)
                  )
                )
                .limit(1);

              if (!existingSong.length) {
                await db.insert(songs).values({
                  artist: artistId,
                  spotifyId: track.id,
                  title: track.name,
                  album: track.album.name,
                  albumArt: track.album.images[0]?.url,
                  previewUrl: track.preview_url,
                  externalUrl: track.external_urls.spotify,
                  popularity: track.popularity,
                  durationMs: track.duration_ms,
                } as any);

                results.songs.synced++;
              }
            } catch (_error) {
              results.songs.errors++;
            }
          }

          // Update progress with song sync details
          await this.progressTracker.updateProgress(artistId, {
            details: {
              songs: results.songs,
              shows: results.shows,
              venues: results.venues,
              setlists: results.setlists,
            },
          });
        } catch (_error) {}
      }

      // Sync Ticketmaster shows if available
      if (artist.ticketmasterId) {
        try {
          await this.progressTracker.updateProgress(artistId, {
            currentStep: 'Syncing shows from Ticketmaster',
            completedSteps: 2,
          });

          let page = 0;
          let hasMore = true;
          const processedEvents = new Set<string>();

          // Fetch ALL pages of events
          while (hasMore && page < 20) {
            // Limit to 20 pages for safety
            const events = await this.ticketmasterClient.searchEvents({
              attractionId: artist.ticketmasterId,
              size: 100, // Max page size
              page,
              startDateTime: `${new Date().toISOString().split('.')[0]}Z`,
              endDateTime: `${
                new Date(Date.now() + 730 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split('.')[0]
              }Z`, // 2 years ahead
            });

            if (events._embedded?.events) {
              for (const event of events._embedded.events) {
                if (processedEvents.has(event.id)) {
                  continue;
                }
                processedEvents.add(event.id);

                try {
                  // Process venue first
                  let venueId = null;
                  if (event._embedded?.venues?.[0]) {
                    const tmVenue = event._embedded.venues[0];
                    venueId = await this.syncVenue(tmVenue);
                    if (venueId) {
                      results.venues.synced++;
                    }
                  }

                  // Check if show already exists
                  const existingShow = await db
                    .select()
                    .from(shows)
                    .where(eq(shows.ticketmasterId, event.id))
                    .limit(1);

                  if (existingShow.length) {
                    // Update existing show with latest information
                    await db
                      .update(shows)
                      .set({
                        minPrice:
                          event.priceRanges?.[0]?.min ||
                          existingShow[0]?.minPrice,
                        maxPrice:
                          event.priceRanges?.[0]?.max ||
                          existingShow[0]?.maxPrice,
                        status: this.determineShowStatus(event),
                        ticketUrl: event.url,
                        updatedAt: new Date(),
                      })
                      .where(eq(shows.id, existingShow[0]!.id));

                    // Update supporting artists for existing show
                    // First, check if we already have the headliner in show_artists
                    const existingShowArtists = await db
                      .select()
                      .from(showArtists)
                      .where(eq(showArtists.showId, existingShow[0]!.id));

                    if (existingShowArtists.length === 0) {
                      // Add headliner if missing
                      await db.insert(showArtists).values({
                        showId: existingShow[0]!.id,
                        artistId: artistId,
                        orderIndex: 0,
                        isHeadliner: true,
                      } as any);
                    }

                    // Process support acts if available
                    if (
                      event._embedded?.attractions &&
                      event._embedded.attractions.length > 1
                    ) {
                      for (
                        let i = 1;
                        i < event._embedded.attractions.length;
                        i++
                      ) {
                        const supportAct = event._embedded.attractions[i];

                        // Check if this supporting act already exists for this show
                        const existingSupport = existingShowArtists.find(
                          (sa) => sa.orderIndex === i
                        );

                        if (!existingSupport) {
                          // Check if we have this artist in our database
                          let supportArtistId: string | null = null;

                          const existingSupportArtist = await db
                            .select()
                            .from(artists)
                            .where(eq(artists.ticketmasterId, supportAct.id))
                            .limit(1);

                          if (existingSupportArtist.length > 0) {
                            supportArtistId = existingSupportArtist[0]!.id;
                          } else {
                            // Create a basic artist record for the supporting act
                            const [newSupportArtist] = await db
                              .insert(artists)
                              .values({
                                ticketmasterId: supportAct.id,
                                name: supportAct.name,
                                slug: this.generateSlug(supportAct.name),
                                imageUrl: supportAct.images?.[0]?.url || null,
                                smallImageUrl:
                                  supportAct.images?.[2]?.url || null,
                              })
                              .returning();
                            supportArtistId = newSupportArtist!.id;
                          }

                          // Add supporting artist to show_artists
                          await db.insert(showArtists).values({
                            showId: existingShow[0]!.id,
                            artistId: supportArtistId,
                            orderIndex: i,
                            isHeadliner: false,
                          } as any);
                        }
                      }
                    }
                  } else {
                    // Extract all available information
                    const showData = {
                      ticketmasterId: event.id,
                      headlinerArtistId: artistId,
                      venueId,
                      name: event.name,
                      slug: this.generateSlug(event.name),
                      date: new Date(event.dates.start.localDate),
                      startTime: event.dates.start.localTime || null,
                      doorsTime: event.dates.doorTime || null,
                      status: this.determineShowStatus(event),
                      description: event.info || event.pleaseNote || null,
                      ticketUrl: event.url,
                      minPrice: event.priceRanges?.[0]?.min || null,
                      maxPrice: event.priceRanges?.[0]?.max || null,
                      currency: event.priceRanges?.[0]?.currency || 'USD',
                      isVerified: true, // Ticketmaster shows are verified
                    };

                    const [newShow] = await db
                      .insert(shows)
                      .values(showData as any)
                      .returning();
                    results.shows.synced++;

                    // Always add the headliner to show_artists
                    await db.insert(showArtists).values({
                      showId: newShow!.id,
                      artistId: artistId,
                      orderIndex: 0,
                      isHeadliner: true,
                    } as any);

                    // Process support acts if available
                    if (
                      event._embedded?.attractions &&
                      event._embedded.attractions.length > 1
                    ) {
                      for (
                        let i = 1;
                        i < event._embedded.attractions.length;
                        i++
                      ) {
                        const supportAct = event._embedded.attractions[i];

                        // Check if we have this artist in our database
                        let supportArtistId: string | null = null;

                        const existingSupportArtist = await db
                          .select()
                          .from(artists)
                          .where(eq(artists.ticketmasterId, supportAct.id))
                          .limit(1);

                        if (existingSupportArtist.length > 0) {
                          supportArtistId = existingSupportArtist[0]!.id;
                        } else {
                          // Create a basic artist record for the supporting act
                          const [newSupportArtist] = await db
                            .insert(artists)
                            .values({
                              ticketmasterId: supportAct.id,
                              name: supportAct.name,
                              slug: this.generateSlug(supportAct.name),
                              imageUrl: supportAct.images?.[0]?.url || null,
                              smallImageUrl:
                                supportAct.images?.[2]?.url || null,
                            })
                            .returning();
                          supportArtistId = newSupportArtist!.id;
                        }

                        // Add supporting artist to show_artists
                        await db.insert(showArtists).values({
                          showId: newShow!.id,
                          artistId: supportArtistId,
                          orderIndex: i,
                          isHeadliner: false,
                        } as any);
                      }
                    }
                  }
                } catch (_error) {
                  results.shows.errors++;
                }
              }

              // Check if there are more pages
              const totalPages = Math.ceil(
                (events.page?.totalElements || 0) / (events.page?.size || 100)
              );
              hasMore = page < totalPages - 1;
              page++;

              // Rate limiting between pages
              await RateLimiter.delay(500);
            } else {
              hasMore = false;
            }

            // Update progress after each page
            await this.progressTracker.updateProgress(artistId, {
              details: {
                songs: results.songs,
                shows: results.shows,
                venues: results.venues,
                setlists: results.setlists,
              },
            });
          }
        } catch (_error) {}
      }

      // Sync setlists from Setlist.fm if available
      if (this.setlistFmClient) {
        try {
          // Check if artist has mbid column (database schema compatibility)
          let mbid = (artist as any).mbid || null;

          // If no MBID stored, try to find it
          if (!mbid) {
            mbid = await this.setlistFmClient.findArtistMbid(artist.name);
            if (mbid) {
              // Try to store the MBID for future use (if column exists)
              try {
                await db
                  .update(artists)
                  .set({ mbid } as any)
                  .where(eq(artists.id, artistId));
              } catch (_error) {
                // Continue without storing MBID
              }
            }
          }

          if (mbid) {
            // Get recent setlists (last 30 days)
            const recentSetlists = await this.setlistFmClient.getRecentSetlists(
              mbid,
              30
            );

            for (const setlistData of recentSetlists) {
              try {
                const formattedSetlist =
                  this.setlistFmClient.formatSetlistForDb(setlistData);

                // Find or create venue
                let venueId: string | null = null;
                const existingVenue = await db
                  .select()
                  .from(venues)
                  .where(
                    and(
                      eq(venues.name, formattedSetlist.venue.name),
                      eq(venues.city, formattedSetlist.venue.city)
                    )
                  )
                  .limit(1);

                if (existingVenue.length > 0) {
                  venueId = existingVenue[0].id;
                } else {
                  const [newVenue] = await db
                    .insert(venues)
                    .values({
                      name: formattedSetlist.venue.name,
                      slug: this.generateSlug(formattedSetlist.venue.name),
                      city: formattedSetlist.venue.city,
                      state: formattedSetlist.venue.state,
                      country: formattedSetlist.venue.country,
                      latitude: formattedSetlist.venue.latitude,
                      longitude: formattedSetlist.venue.longitude,
                    })
                    .returning();
                  venueId = newVenue.id;
                }

                // Find or create show
                let showId: string;
                const eventDate = new Date(setlistData.eventDate);
                const existingShow = await db
                  .select()
                  .from(shows)
                  .where(
                    and(
                      eq(shows.headlinerArtistId, artistId),
                      eq(shows.date, eventDate.toISOString().split('T')[0]),
                      venueId
                        ? eq(shows.venueId, venueId)
                        : isNull(shows.venueId)
                    )
                  )
                  .limit(1);

                if (existingShow.length > 0) {
                  showId = existingShow[0].id;
                } else {
                  const [newShow] = await db
                    .insert(shows)
                    .values({
                      headlinerArtistId: artistId,
                      venueId,
                      name: `${artist.name} at ${formattedSetlist.venue.name}`,
                      slug: this.generateSlug(
                        `${artist.name}-${formattedSetlist.venue.name}-${eventDate.toISOString().split('T')[0]}`
                      ),
                      date: eventDate.toISOString().split('T')[0],
                      status: eventDate < new Date() ? 'completed' : 'upcoming',
                      setlistFmId: setlistData.id,
                    })
                    .returning();
                  showId = newShow.id;
                }

                // Check if we already have a setlist for this show
                const existingSetlist = await db
                  .select()
                  .from(setlists)
                  .where(
                    and(
                      eq(setlists.showId, showId),
                      eq(setlists.type, 'actual')
                    )
                  )
                  .limit(1);

                if (
                  existingSetlist.length === 0 &&
                  formattedSetlist.songs.length > 0
                ) {
                  // Create the actual setlist
                  const [newSetlist] = await db
                    .insert(setlists)
                    .values({
                      showId,
                      artistId,
                      type: 'actual',
                      name: 'Actual Setlist',
                      isLocked: true,
                      importedFrom: 'setlist.fm',
                      externalId: setlistData.id,
                      importedAt: new Date(),
                    })
                    .returning();

                  // Add songs to the setlist
                  for (const songData of formattedSetlist.songs) {
                    // Find or create the song
                    let songId: string;

                    // First check if we have this song linked to the artist
                    const existingSong = await db
                      .select({ song: songs })
                      .from(songs)
                      .innerJoin(artistSongs, eq(artistSongs.songId, songs.id))
                      .where(
                        and(
                          eq(artistSongs.artistId, artistId),
                          eq(songs.title, songData.name)
                        )
                      )
                      .limit(1);

                    if (existingSong.length > 0) {
                      songId = existingSong[0].song.id;
                    } else {
                      // Create a new song
                      const [newSong] = await db
                        .insert(songs)
                        .values({
                          title: songData.name,
                          artist: artist.name,
                        })
                        .returning();
                      songId = newSong.id;

                      // Link to artist
                      await db.insert(artistSongs).values({
                        artistId,
                        songId,
                        isPrimaryArtist: true,
                      });
                    }

                    // Add to setlist with encore detection
                    const isEncore = songData.setName
                      ?.toLowerCase()
                      .includes('encore');
                    const notes = [];

                    if (isEncore) {
                      notes.push('Encore');
                    }

                    if (
                      songData.setName &&
                      songData.setName !== 'Main Set' &&
                      !isEncore
                    ) {
                      notes.push(songData.setName);
                    }

                    await db.insert(setlistSongs).values({
                      setlistId: newSetlist.id,
                      songId,
                      position: songData.position,
                      notes: notes.length > 0 ? notes.join(', ') : null,
                      isPlayed: true,
                    });
                  }

                  results.setlists.synced++;
                }
              } catch (_error) {
                results.setlists.errors++;
              }
            }
          }
        } catch (_error) {}
      }

      // Calculate artist stats after all sync operations
      await this.progressTracker.updateProgress(artistId, {
        currentStep: 'Calculating artist statistics',
        completedSteps: 3,
      });

      try {
        await this.calculateArtistStats(artistId);
        results.stats.calculated = true;
      } catch (_error) {}

      // Complete sync
      await this.progressTracker.completeSync(artistId);
      await this.progressTracker.updateProgress(artistId, {
        completedSteps: 4,
        details: {
          songs: results.songs,
          shows: results.shows,
          venues: results.venues,
          setlists: results.setlists,
        },
      });
    } catch (error) {
      await this.progressTracker.completeSync(
        artistId,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }

    return results;
  }

  private async syncVenue(tmVenue: any): Promise<string | null> {
    try {
      // Check if venue already exists
      const existingVenue = await db
        .select()
        .from(venues)
        .where(eq(venues.ticketmasterId, tmVenue.id))
        .limit(1);

      if (existingVenue.length > 0) {
        return existingVenue[0].id;
      }

      const venueData = {
        ticketmasterId: tmVenue.id,
        name: tmVenue.name,
        slug: this.generateSlug(tmVenue.name),
        address: tmVenue.address?.line1 || null,
        city: tmVenue.city?.name || null,
        state: tmVenue.state?.stateCode || null,
        country: tmVenue.country?.countryCode || null,
        postalCode: tmVenue.postalCode || null,
        latitude: tmVenue.location?.latitude
          ? Number.parseFloat(tmVenue.location.latitude)
          : null,
        longitude: tmVenue.location?.longitude
          ? Number.parseFloat(tmVenue.location.longitude)
          : null,
        timezone: tmVenue.timezone || null,
        capacity: tmVenue.capacity || null,
        website: tmVenue.url || null,
      };

      const [venue] = await db.insert(venues).values(venueData).returning();

      return venue.id;
    } catch (_error) {
      return null;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private determineShowStatus(
    event: any
  ): 'upcoming' | 'ongoing' | 'completed' | 'cancelled' {
    const now = new Date();
    const eventDate = new Date(
      event.dates.start.dateTime || event.dates.start.localDate
    );

    if (event.dates.status?.code === 'cancelled') {
      return 'cancelled';
    }

    if (eventDate < now) {
      return 'completed';
    }

    return 'upcoming';
  }

  private async calculateArtistStats(artistId: string): Promise<void> {
    // Get total shows count
    const showsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(shows)
      .where(eq(shows.headlinerArtistId, artistId));

    const totalShows = Number(showsCount[0]?.count || 0);

    // Get upcoming shows count
    const upcomingShowsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(shows)
      .where(
        and(eq(shows.headlinerArtistId, artistId), eq(shows.status, 'upcoming'))
      );

    const upcomingShows = Number(upcomingShowsCount[0]?.count || 0);

    // Get total setlists count
    const setlistsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(setlists)
      .where(eq(setlists.artistId, artistId));

    const totalSetlists = Number(setlistsCount[0]?.count || 0);

    // Calculate average setlist length
    const avgLengthResult = await db
      .select({
        avg: sql<number>`avg(song_count)`,
      })
      .from(
        sql`(
            SELECT COUNT(*) as song_count
            FROM ${setlists} s
            JOIN ${setlistSongs} ss ON s.id = ss.setlist_id
            WHERE s.artist_id = ${artistId}
            GROUP BY s.id
          ) as setlist_lengths`
      );

    const avgSetlistLength = avgLengthResult[0]?.avg || 0;

    // Get total votes across all setlists
    const totalVotesResult = await db
      .select({
        totalVotes: sql<number>`sum(total_votes)`,
      })
      .from(setlists)
      .where(eq(setlists.artistId, artistId));

    const totalVotes = Number(totalVotesResult[0]?.totalVotes || 0);

    // Get most played song
    const mostPlayedResult = await db
      .select({
        songTitle: songs.title,
        playCount: sql<number>`count(*)`.as('play_count'),
      })
      .from(setlistSongs)
      .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
      .innerJoin(songs, eq(setlistSongs.songId, songs.id))
      .where(and(eq(setlists.artistId, artistId), eq(setlists.type, 'actual')))
      .groupBy(songs.title)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    const mostPlayedSong = mostPlayedResult[0]?.songTitle || null;

    // Get last show date
    const lastShowResult = await db
      .select({ date: shows.date })
      .from(shows)
      .where(
        and(
          eq(shows.headlinerArtistId, artistId),
          eq(shows.status, 'completed')
        )
      )
      .orderBy(desc(shows.date))
      .limit(1);

    const lastShowDate = lastShowResult[0]?.date
      ? new Date(lastShowResult[0].date)
      : null;

    // Check if stats record exists
    const existingStats = await db
      .select()
      .from(artistStats)
      .where(eq(artistStats.artistId, artistId))
      .limit(1);

    const statsData = {
      totalShows,
      upcomingShows,
      totalSetlists,
      avgSetlistLength: Number(avgSetlistLength.toFixed(1)),
      mostPlayedSong,
      lastShowDate,
      totalVotes,
      updatedAt: new Date(),
    };

    if (existingStats.length > 0) {
      // Update existing stats
      await db
        .update(artistStats)
        .set(statsData)
        .where(eq(artistStats.artistId, artistId));
    } else {
      // Create new stats record
      await db.insert(artistStats).values({
        artistId,
        ...statsData,
      });
    }

    // Update artist record with quick stats
    await db
      .update(artists)
      .set({
        totalShows,
        upcomingShows,
        totalSetlists,
        updatedAt: new Date(),
      })
      .where(eq(artists.id, artistId));
  }

  async syncBulkArtists(artistIds: string[]) {
    const results = {
      total: artistIds.length,
      synced: 0,
      errors: 0,
      details: [] as any[],
    };

    for (const artistId of artistIds) {
      try {
        const syncResult = await this.syncArtistCatalog(artistId);
        results.synced++;
        results.details.push({
          artistId,
          success: true,
          ...syncResult,
        });
      } catch (error) {
        results.errors++;
        results.details.push({
          artistId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Rate limiting between artists
      await RateLimiter.delay(500);
    }

    return results;
  }
}
