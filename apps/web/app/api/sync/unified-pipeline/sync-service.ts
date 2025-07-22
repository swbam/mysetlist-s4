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
import {
  ArtistSyncService,
  ShowSyncService,
  SetlistSyncService,
  VenueSyncService,
  SyncScheduler,
} from '@repo/external-apis';

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

// Unified Sync Service
export class UnifiedSyncService {
  private artistSyncService: ArtistSyncService;
  private showSyncService: ShowSyncService;
  private setlistSyncService: SetlistSyncService;
  private venueSyncService: VenueSyncService;
  private syncScheduler: SyncScheduler;
  private progressTracker: SyncProgressTracker;

  constructor() {
    this.artistSyncService = new ArtistSyncService();
    this.showSyncService = new ShowSyncService();
    this.setlistSyncService = new SetlistSyncService();
    this.venueSyncService = new VenueSyncService();
    this.syncScheduler = new SyncScheduler();
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

      // Sync artist data from all sources
      if (artist.spotifyId) {
        try {
          await this.progressTracker.updateProgress(artistId, {
            currentStep: 'Syncing artist from Spotify',
            completedSteps: 1,
          });

          // Use the ArtistSyncService to sync from Spotify
          await this.artistSyncService.syncArtist(artist.spotifyId);
          results.artist.updated = true;
          
          // Update song sync results
          const songCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(songs)
            .innerJoin(artistSongs, eq(artistSongs.songId, songs.id))
            .where(eq(artistSongs.artistId, artistId));
          
          results.songs.synced = Number(songCount[0]?.count || 0);

          // Update progress with song sync details
          await this.progressTracker.updateProgress(artistId, {
            details: {
              songs: results.songs,
              shows: results.shows,
              venues: results.venues,
              setlists: results.setlists,
            },
          });
        } catch (error) {
          results.artist.updated = false;
          console.error('Artist sync error:', error);
        }
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
                      .where(eq(shows.id, existingShow[0]!['id']));

                    // Update supporting artists for existing show
                    // First, check if we already have the headliner in show_artists
                    const existingShowArtists = await db
                      .select()
                      .from(showArtists)
                      .where(eq(showArtists.showId, existingShow[0]!['id']));

                    if (existingShowArtists.length === 0) {
                      // Add headliner if missing
                      await db.insert(showArtists).values({
                        showId: existingShow[0]!['id'],
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
                            supportArtistId = existingSupportArtist[0]!['id'];
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
                            showId: existingShow[0]!['id'],
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
                          supportArtistId = existingSupportArtist[0]!['id'];
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
                    const notes: any[] = [];

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
