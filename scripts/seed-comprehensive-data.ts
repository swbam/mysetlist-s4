#!/usr/bin/env tsx

import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../packages/database/src/client';
import {
  artists,
  venues,
  shows,
  songs,
  setlists,
  setlistSongs,
  showArtists,
  users,
  userProfiles,
  votes,
  artistStats,
  userFollowsArtists,
  attendance,
} from '../packages/database/src/schema';
import { ArtistSyncService } from '../packages/external-apis/src/services/artist-sync.service';
import { TicketmasterService } from '../packages/external-apis/src/services/ticketmaster.service';
import { SetlistFmService } from '../packages/external-apis/src/services/setlistfm.service';
import { SpotifyService } from '../packages/external-apis/src/services/spotify.service';

interface SeedStats {
  artists: number;
  venues: number;
  shows: number;
  songs: number;
  setlists: number;
  users: number;
  votes: number;
  follows: number;
  attendance: number;
}

class ComprehensiveSeeder {
  private artistSync: ArtistSyncService;
  private ticketmaster: TicketmasterService;
  private setlistfm: SetlistFmService;
  private spotify: SpotifyService;
  private stats: SeedStats = {
    artists: 0,
    venues: 0,
    shows: 0,
    songs: 0,
    setlists: 0,
    users: 0,
    votes: 0,
    follows: 0,
    attendance: 0,
  };

  constructor() {
    this.artistSync = new ArtistSyncService();
    this.ticketmaster = new TicketmasterService();
    this.setlistfm = new SetlistFmService();
    this.spotify = new SpotifyService();
  }

  async seed(): Promise<void> {
    console.log('🌱 Starting comprehensive database seeding...\n');

    try {
      // 1. Seed popular artists from multiple sources
      await this.seedPopularArtists();

      // 2. Seed venues from real Ticketmaster data
      await this.seedVenues();

      // 3. Seed shows (both past and upcoming)
      await this.seedShows();

      // 4. Seed songs and setlists
      await this.seedSongsAndSetlists();

      // 5. Seed user data and interactions
      await this.seedUsersAndInteractions();

      // 6. Update artist stats
      await this.updateArtistStats();

      // 7. Update trending scores
      await this.updateTrendingScores();

      console.log('\n🎉 Seeding completed successfully!');
      console.log('📊 Final statistics:');
      console.table(this.stats);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  }

  private async seedPopularArtists(): Promise<void> {
    console.log('🎤 Seeding popular artists...');

    // Popular artists across different genres
    const popularArtistNames = [
      // Pop
      'Taylor Swift', 'Billie Eilish', 'Olivia Rodrigo', 'Dua Lipa', 'Ariana Grande',
      'The Weeknd', 'Ed Sheeran', 'Harry Styles', 'Bruno Mars', 'Doja Cat',
      
      // Rock
      'Coldplay', 'Imagine Dragons', 'Arctic Monkeys', 'The 1975', 'Twenty One Pilots',
      'Foo Fighters', 'Red Hot Chili Peppers', 'Green Day', 'Pearl Jam', 'Radiohead',
      
      // Hip Hop
      'Drake', 'Kendrick Lamar', 'Travis Scott', 'Post Malone', 'Bad Bunny',
      'J. Cole', 'Tyler, The Creator', 'Lil Baby', 'Future', 'Megan Thee Stallion',
      
      // Electronic/Dance
      'Calvin Harris', 'The Chainsmokers', 'Marshmello', 'David Guetta', 'Tiësto',
      'deadmau5', 'Skrillex', 'Diplo', 'Martin Garrix', 'Swedish House Mafia',
      
      // Alternative/Indie
      'Tame Impala', 'The Strokes', 'Vampire Weekend', 'Cage The Elephant', 'Foster The People',
      'MGMT', 'Two Door Cinema Club', 'Alt-J', 'Glass Animals', 'The Killers',
      
      // Country
      'Morgan Wallen', 'Luke Combs', 'Kane Brown', 'Blake Shelton', 'Carrie Underwood',
      
      // Latin
      'Karol G', 'Peso Pluma', 'Rauw Alejandro', 'Maluma', 'Anitta',
    ];

    for (const artistName of popularArtistNames) {
      try {
        console.log(`  Syncing ${artistName}...`);
        
        // Try to get from Spotify first
        const spotifySearchResult = await this.spotify.searchArtist(artistName);
        if (spotifySearchResult) {
          const existingArtist = await db
            .select()
            .from(artists)
            .where(eq(artists.spotifyId, spotifySearchResult.id))
            .limit(1);

          if (existingArtist.length === 0) {
            const [newArtist] = await db.insert(artists).values({
              spotifyId: spotifySearchResult.id,
              name: spotifySearchResult.name,
              slug: spotifySearchResult.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              imageUrl: spotifySearchResult.images[0]?.url,
              smallImageUrl: spotifySearchResult.images[2]?.url,
              genres: JSON.stringify(spotifySearchResult.genres || []),
              popularity: spotifySearchResult.popularity || 0,
              followers: spotifySearchResult.followers?.total || 0,
              verified: true,
              externalUrls: JSON.stringify(spotifySearchResult.external_urls || {}),
              bio: `${spotifySearchResult.name} is one of today's most popular artists with ${spotifySearchResult.followers?.total?.toLocaleString()} followers on Spotify.`,
              lastSyncedAt: new Date(),
              trendingScore: Math.random() * 50 + (spotifySearchResult.popularity || 0) / 2,
            }).returning();

            this.stats.artists++;
            console.log(`    ✅ Added ${newArtist.name}`);
          } else {
            console.log(`    ℹ️  ${artistName} already exists`);
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`    ❌ Failed to sync ${artistName}:`, error);
      }
    }
  }

  private async seedVenues(): Promise<void> {
    console.log('\n🏟️  Seeding venues from Ticketmaster...');

    try {
      // Get venues from major US cities
      const cities = [
        { city: 'New York', stateCode: 'NY', countryCode: 'US' },
        { city: 'Los Angeles', stateCode: 'CA', countryCode: 'US' },
        { city: 'Chicago', stateCode: 'IL', countryCode: 'US' },
        { city: 'Houston', stateCode: 'TX', countryCode: 'US' },
        { city: 'Phoenix', stateCode: 'AZ', countryCode: 'US' },
        { city: 'Philadelphia', stateCode: 'PA', countryCode: 'US' },
        { city: 'San Antonio', stateCode: 'TX', countryCode: 'US' },
        { city: 'San Diego', stateCode: 'CA', countryCode: 'US' },
        { city: 'Dallas', stateCode: 'TX', countryCode: 'US' },
        { city: 'Austin', stateCode: 'TX', countryCode: 'US' },
        { city: 'Nashville', stateCode: 'TN', countryCode: 'US' },
        { city: 'Seattle', stateCode: 'WA', countryCode: 'US' },
        { city: 'Denver', stateCode: 'CO', countryCode: 'US' },
        { city: 'Boston', stateCode: 'MA', countryCode: 'US' },
        { city: 'Atlanta', stateCode: 'GA', countryCode: 'US' },
      ];

      for (const location of cities) {
        try {
          const tmVenues = await this.ticketmaster.searchVenues(location.city, 5);
          
          for (const tmVenue of tmVenues) {
            const existingVenue = await db
              .select()
              .from(venues)
              .where(eq(venues.ticketmasterId, tmVenue.id))
              .limit(1);

            if (existingVenue.length === 0) {
              const [newVenue] = await db.insert(venues).values({
                ticketmasterId: tmVenue.id,
                name: tmVenue.name,
                slug: tmVenue.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                city: tmVenue.city?.name || location.city,
                state: tmVenue.state?.stateCode || location.stateCode,
                country: tmVenue.country?.countryCode || location.countryCode,
                address: tmVenue.address?.line1,
                postalCode: tmVenue.postalCode,
                timezone: tmVenue.timezone || 'America/New_York',
                latitude: tmVenue.location?.latitude ? parseFloat(tmVenue.location.latitude) : null,
                longitude: tmVenue.location?.longitude ? parseFloat(tmVenue.location.longitude) : null,
                capacity: Math.floor(Math.random() * 20000) + 1000, // Ticketmaster doesn't always provide capacity
                venueType: tmVenue.type || 'venue',
                phoneNumber: tmVenue.boxOfficeInfo?.phoneNumberDetail,
                website: tmVenue.url,
                imageUrl: tmVenue.images?.[0]?.url,
              }).returning();

              this.stats.venues++;
              console.log(`    ✅ Added venue: ${newVenue.name} in ${newVenue.city}, ${newVenue.state}`);
            }
          }

          await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
        } catch (error) {
          console.error(`    ❌ Failed to get venues for ${location.city}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to seed venues:', error);
    }
  }

  private async seedShows(): Promise<void> {
    console.log('\n🎭 Seeding shows...');

    // Get all artists and venues
    const artistList = await db.select().from(artists).limit(30);
    const venueList = await db.select().from(venues).limit(20);

    if (artistList.length === 0 || venueList.length === 0) {
      console.log('  ⚠️  Not enough artists or venues to create shows');
      return;
    }

    // Create shows for each artist
    for (const artist of artistList) {
      try {
        // Search for real events from Ticketmaster
        if (artist.name) {
          const tmEvents = await this.ticketmaster.searchEvents(artist.name, 5);
          
          for (const tmEvent of tmEvents) {
            // Find or create venue
            let venue = venueList[0]; // Default venue
            if (tmEvent._embedded?.venues?.[0]) {
              const tmVenue = tmEvent._embedded.venues[0];
              const existingVenue = await db
                .select()
                .from(venues)
                .where(eq(venues.ticketmasterId, tmVenue.id))
                .limit(1);
              
              if (existingVenue.length > 0) {
                venue = existingVenue[0];
              }
            }

            // Create show
            const showDate = new Date(tmEvent.dates.start.dateTime || tmEvent.dates.start.localDate);
            const status = showDate > new Date() ? 'upcoming' : 'completed';

            const [newShow] = await db.insert(shows).values({
              ticketmasterId: tmEvent.id,
              headlinerArtistId: artist.id,
              venueId: venue.id,
              name: tmEvent.name,
              slug: `${artist.slug}-${showDate.getTime()}`,
              date: showDate.toISOString().split('T')[0],
              startTime: tmEvent.dates.start.localTime || '20:00:00',
              status,
              description: tmEvent.info || `${artist.name} live at ${venue.name}`,
              imageUrl: tmEvent.images?.[0]?.url,
              minPrice: tmEvent.priceRanges?.[0]?.min || 25,
              maxPrice: tmEvent.priceRanges?.[0]?.max || 150,
              ticketUrl: tmEvent.url,
              viewCount: Math.floor(Math.random() * 5000),
              attendeeCount: Math.floor(Math.random() * 2000),
              trendingScore: Math.random() * 20,
            }).returning();

            // Add to show_artists junction table
            await db.insert(showArtists).values({
              showId: newShow.id,
              artistId: artist.id,
              artistType: 'headliner',
              orderIndex: 0,
            });

            this.stats.shows++;
            console.log(`    ✅ Added show: ${newShow.name} on ${newShow.date}`);
          }
        }

        // Also create some synthetic shows for variety
        const syntheticShowCount = 2;
        for (let i = 0; i < syntheticShowCount; i++) {
          const randomVenue = venueList[Math.floor(Math.random() * venueList.length)];
          const daysOffset = Math.floor(Math.random() * 180) - 60; // -60 to +120 days
          const showDate = new Date();
          showDate.setDate(showDate.getDate() + daysOffset);
          
          const status = showDate > new Date() ? 'upcoming' : 'completed';

          const [newShow] = await db.insert(shows).values({
            headlinerArtistId: artist.id,
            venueId: randomVenue.id,
            name: `${artist.name} ${status === 'upcoming' ? 'Live' : 'Was Live'} at ${randomVenue.name}`,
            slug: `${artist.slug}-${randomVenue.slug}-${showDate.getTime()}`,
            date: showDate.toISOString().split('T')[0],
            startTime: `${19 + Math.floor(Math.random() * 3)}:00:00`,
            status,
            description: `Experience ${artist.name} in an unforgettable performance at ${randomVenue.name}.`,
            minPrice: Math.floor(Math.random() * 100) + 30,
            maxPrice: Math.floor(Math.random() * 300) + 100,
            viewCount: Math.floor(Math.random() * 10000),
            attendeeCount: Math.floor(Math.random() * 5000),
            trendingScore: Math.random() * 15,
          }).returning();

          await db.insert(showArtists).values({
            showId: newShow.id,
            artistId: artist.id,
            artistType: 'headliner',
            orderIndex: 0,
          });

          this.stats.shows++;
        }

        await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
      } catch (error) {
        console.error(`    ❌ Failed to create shows for ${artist.name}:`, error);
      }
    }
  }

  private async seedSongsAndSetlists(): Promise<void> {
    console.log('\n🎵 Seeding songs and setlists...');

    const artistList = await db.select().from(artists).limit(20);
    const showList = await db.select().from(shows).limit(50);

    // Seed songs for each artist
    for (const artist of artistList) {
      try {
        if (artist.spotifyId) {
          // Get top tracks from Spotify
          const topTracks = await this.spotify.getArtistTopTracks(artist.spotifyId);
          
          for (const track of topTracks.slice(0, 20)) {
            const existingSong = await db
              .select()
              .from(songs)
              .where(eq(songs.spotifyId, track.id))
              .limit(1);

            if (existingSong.length === 0) {
              const [newSong] = await db.insert(songs).values({
                spotifyId: track.id,
                title: track.name,
                artist: artist.name,
                artistId: artist.id,
                album: track.album.name,
                albumId: track.album.id,
                durationMs: track.duration_ms,
                popularity: track.popularity,
                isExplicit: track.explicit,
                isPlayable: track.is_playable !== false,
                previewUrl: track.preview_url,
                externalUrls: JSON.stringify(track.external_urls || {}),
                albumImageUrl: track.album.images?.[0]?.url,
                releaseDate: track.album.release_date,
              }).returning();

              this.stats.songs++;
            }
          }
        }

        // Also add some synthetic songs for variety
        const syntheticSongs = [
          'Opening Act', 'Crowd Favorite', 'New Single', 'Classic Hit', 'Deep Cut',
          'Fan Request', 'Acoustic Version', 'Extended Mix', 'Live Debut', 'Surprise Cover'
        ];

        for (const songTitle of syntheticSongs) {
          const [newSong] = await db.insert(songs).values({
            title: `${songTitle} - ${artist.name}`,
            artist: artist.name,
            artistId: artist.id,
            album: 'Live Collection',
            durationMs: Math.floor(Math.random() * 300000) + 120000,
            popularity: Math.floor(Math.random() * 100),
            isExplicit: false,
            isPlayable: true,
          }).returning();

          this.stats.songs++;
        }
      } catch (error) {
        console.error(`    ❌ Failed to seed songs for ${artist.name}:`, error);
      }
    }

    // Create setlists for shows
    const allSongs = await db.select().from(songs);
    
    for (const show of showList) {
      try {
        // Get songs for the headliner artist
        const artistSongs = allSongs.filter(s => s.artistId === show.headlinerArtistId);
        
        if (artistSongs.length > 0) {
          // Main set
          const [mainSetlist] = await db.insert(setlists).values({
            showId: show.id,
            artistId: show.headlinerArtistId,
            type: show.status === 'completed' ? 'actual' : 'predicted',
            name: 'Main Set',
            orderIndex: 0,
            isLocked: show.status === 'completed',
          }).returning();

          // Add 10-15 songs to main set
          const mainSetSongs = this.shuffleArray(artistSongs).slice(0, Math.floor(Math.random() * 6) + 10);
          for (let i = 0; i < mainSetSongs.length; i++) {
            await db.insert(setlistSongs).values({
              setlistId: mainSetlist.id,
              songId: mainSetSongs[i].id,
              position: i + 1,
              isPlayed: show.status === 'completed' ? Math.random() > 0.1 : null,
              upvotes: Math.floor(Math.random() * 100),
              downvotes: Math.floor(Math.random() * 20),
              netVotes: 0, // Will be calculated by trigger
            });
          }

          this.stats.setlists++;

          // Encore (70% chance)
          if (Math.random() > 0.3) {
            const [encoreSetlist] = await db.insert(setlists).values({
              showId: show.id,
              artistId: show.headlinerArtistId,
              type: show.status === 'completed' ? 'actual' : 'predicted',
              name: 'Encore',
              orderIndex: 1,
              isLocked: show.status === 'completed',
            }).returning();

            // Add 2-4 songs to encore
            const encoreSongs = this.shuffleArray(artistSongs).slice(0, Math.floor(Math.random() * 3) + 2);
            for (let i = 0; i < encoreSongs.length; i++) {
              await db.insert(setlistSongs).values({
                setlistId: encoreSetlist.id,
                songId: encoreSongs[i].id,
                position: i + 1,
                isPlayed: show.status === 'completed' ? true : null,
                upvotes: Math.floor(Math.random() * 150),
                downvotes: Math.floor(Math.random() * 10),
                netVotes: 0,
              });
            }

            this.stats.setlists++;
          }
        }
      } catch (error) {
        console.error(`    ❌ Failed to create setlist for show ${show.id}:`, error);
      }
    }
  }

  private async seedUsersAndInteractions(): Promise<void> {
    console.log('\n👥 Seeding users and interactions...');

    // Create sample users
    const sampleUsers = [
      { email: 'music.lover@example.com', name: 'Music Lover' },
      { email: 'concert.goer@example.com', name: 'Concert Goer' },
      { email: 'setlist.fan@example.com', name: 'Setlist Fan' },
      { email: 'live.music@example.com', name: 'Live Music Enthusiast' },
      { email: 'festival.hopper@example.com', name: 'Festival Hopper' },
      { email: 'indie.rock@example.com', name: 'Indie Rock Fan' },
      { email: 'pop.princess@example.com', name: 'Pop Princess' },
      { email: 'metal.head@example.com', name: 'Metal Head' },
      { email: 'edm.raver@example.com', name: 'EDM Raver' },
      { email: 'jazz.cat@example.com', name: 'Jazz Cat' },
    ];

    const createdUsers = [];
    for (const userData of sampleUsers) {
      try {
        const [newUser] = await db.insert(users).values({
          email: userData.email,
          emailVerified: new Date(),
          updatedAt: new Date(),
        }).returning();

        await db.insert(userProfiles).values({
          userId: newUser.id,
          username: userData.email.split('@')[0],
          displayName: userData.name,
          bio: `${userData.name} - Passionate about live music and discovering new artists!`,
          favoriteGenres: JSON.stringify(['rock', 'indie', 'alternative']),
          showsAttended: Math.floor(Math.random() * 100),
          songsVoted: Math.floor(Math.random() * 500),
        });

        createdUsers.push(newUser);
        this.stats.users++;
      } catch (error) {
        console.error(`    ❌ Failed to create user ${userData.email}:`, error);
      }
    }

    // Create user interactions
    const artistList = await db.select().from(artists).limit(20);
    const setlistSongsList = await db.select().from(setlistSongs).limit(100);
    const showList = await db.select().from(shows).limit(30);

    // User follows artists
    for (const user of createdUsers) {
      const followCount = Math.floor(Math.random() * 10) + 5;
      const artistsToFollow = this.shuffleArray(artistList).slice(0, followCount);

      for (const artist of artistsToFollow) {
        try {
          await db.insert(userFollowsArtists).values({
            userId: user.id,
            artistId: artist.id,
            followedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
          });
          this.stats.follows++;
        } catch (error) {
          // Ignore duplicate key errors
        }
      }
    }

    // User votes on setlist songs
    for (const user of createdUsers) {
      const voteCount = Math.floor(Math.random() * 50) + 20;
      const songsToVote = this.shuffleArray(setlistSongsList).slice(0, voteCount);

      for (const setlistSong of songsToVote) {
        try {
          const voteType = Math.random() > 0.3 ? 'up' : 'down'; // 70% upvotes
          await db.insert(votes).values({
            userId: user.id,
            setlistSongId: setlistSong.id,
            voteType,
            votedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          });
          this.stats.votes++;
        } catch (error) {
          // Ignore duplicate key errors
        }
      }
    }

    // User attendance
    for (const user of createdUsers) {
      const attendCount = Math.floor(Math.random() * 10) + 3;
      const showsToAttend = this.shuffleArray(showList).slice(0, attendCount);

      for (const show of showsToAttend) {
        try {
          await db.insert(attendance).values({
            userId: user.id,
            showId: show.id,
            status: show.status === 'completed' ? 'attended' : 'going',
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          });
          this.stats.attendance++;
        } catch (error) {
          // Ignore duplicate key errors
        }
      }
    }
  }

  private async updateArtistStats(): Promise<void> {
    console.log('\n📊 Updating artist statistics...');

    const artistList = await db.select().from(artists);

    for (const artist of artistList) {
      try {
        // Calculate stats
        const showCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(shows)
          .where(eq(shows.headlinerArtistId, artist.id));

        const upcomingShowCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(shows)
          .where(and(
            eq(shows.headlinerArtistId, artist.id),
            eq(shows.status, 'upcoming')
          ));

        const followerCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(userFollowsArtists)
          .where(eq(userFollowsArtists.artistId, artist.id));

        const avgShowRating = Math.random() * 2 + 3; // 3-5 rating

        // Check if stats exist
        const existingStats = await db
          .select()
          .from(artistStats)
          .where(eq(artistStats.artistId, artist.id))
          .limit(1);

        if (existingStats.length === 0) {
          await db.insert(artistStats).values({
            artistId: artist.id,
            totalShows: Number(showCount[0].count),
            upcomingShows: Number(upcomingShowCount[0].count),
            totalVotes: Math.floor(Math.random() * 10000),
            avgShowRating,
            followerCount: Number(followerCount[0].count),
            lastShowDate: new Date(),
          });
        } else {
          await db
            .update(artistStats)
            .set({
              totalShows: Number(showCount[0].count),
              upcomingShows: Number(upcomingShowCount[0].count),
              followerCount: Number(followerCount[0].count),
              avgShowRating,
              updatedAt: new Date(),
            })
            .where(eq(artistStats.artistId, artist.id));
        }
      } catch (error) {
        console.error(`    ❌ Failed to update stats for ${artist.name}:`, error);
      }
    }
  }

  private async updateTrendingScores(): Promise<void> {
    console.log('\n🔥 Updating trending scores...');

    // Update artist trending scores based on recent activity
    await db.execute(sql`
      UPDATE artists
      SET trending_score = (
        SELECT 
          COALESCE(popularity, 0) * 0.3 +
          COALESCE((
            SELECT COUNT(*)::numeric * 10
            FROM shows
            WHERE shows.headliner_artist_id = artists.id
              AND shows.date >= CURRENT_DATE
              AND shows.date <= CURRENT_DATE + INTERVAL '30 days'
          ), 0) +
          COALESCE((
            SELECT COUNT(*)::numeric * 5
            FROM user_follows_artists
            WHERE user_follows_artists.artist_id = artists.id
              AND user_follows_artists.followed_at >= CURRENT_DATE - INTERVAL '7 days'
          ), 0) +
          RANDOM() * 20
        AS score
      ),
      updated_at = NOW()
    `);

    // Update show trending scores
    await db.execute(sql`
      UPDATE shows
      SET trending_score = (
        CASE 
          WHEN date >= CURRENT_DATE AND date <= CURRENT_DATE + INTERVAL '30 days' THEN
            COALESCE(view_count, 0) * 0.01 +
            COALESCE(attendee_count, 0) * 0.1 +
            RANDOM() * 30 + 20
          ELSE
            COALESCE(view_count, 0) * 0.005 +
            COALESCE(attendee_count, 0) * 0.05 +
            RANDOM() * 10
        END
      )
    `);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Main execution
async function main() {
  const seeder = new ComprehensiveSeeder();
  
  console.log('🚀 MySetlist Comprehensive Database Seeder\n');
  console.log('This script will populate your database with:');
  console.log('  - Popular artists from Spotify');
  console.log('  - Real venues from Ticketmaster');
  console.log('  - Upcoming and past shows');
  console.log('  - Song catalogs and setlists');
  console.log('  - Sample users and interactions');
  console.log('\nThis process may take several minutes...\n');

  try {
    await seeder.seed();
    console.log('\n✨ Database seeding completed successfully!');
    console.log('You can now test the application with real data.');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ComprehensiveSeeder };