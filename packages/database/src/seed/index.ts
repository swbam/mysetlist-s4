import { ArtistSyncService } from "@repo/external-apis";
import { db } from "../client";
import {
  artists,
  setlistSongs,
  setlists,
  showArtists,
  shows,
  songs,
  venues,
} from "../schema";

interface SeedOptions {
  artists?: number;
  venues?: number;
  shows?: number;
  songs?: number;
  useExternalApis?: boolean;
  syncPopularArtists?: boolean;
}

export class DatabaseSeeder {
  private artistSync: ArtistSyncService;

  constructor() {
    this.artistSync = new ArtistSyncService();
  }

  async seedDatabase(options: SeedOptions = {}): Promise<void> {
    const {
      artists: artistCount = 50,
      venues: venueCount = 20,
      shows: showCount = 100,
      songs: songCount = 200,
      useExternalApis = false,
      syncPopularArtists = false,
    } = options;
    // If using external APIs, sync real data
    if (useExternalApis) {
      await this.seedWithExternalApis(syncPopularArtists);
      return;
    }

    // Seed venues first
    const seededVenues = await this.seedVenues(venueCount);

    // Seed artists
    const seededArtists = await this.seedArtists(artistCount);

    // Seed songs
    const seededSongs = await this.seedSongs(songCount, seededArtists);

    // Seed shows
    const seededShows = await this.seedShows(
      showCount,
      seededArtists,
      seededVenues,
    );

    // Seed setlists
    const _seededSetlists = await this.seedSetlists(seededShows, seededSongs);
  }

  private async seedWithExternalApis(
    syncPopularArtists: boolean,
  ): Promise<void> {
    if (syncPopularArtists) {
      await this.artistSync.syncPopularArtists();
    }
  }

  private async seedVenues(count: number): Promise<any[]> {
    const sampleVenues = Array.from({ length: count }, (_, i) => {
      const venueTypes = [
        "arena",
        "theater",
        "club",
        "amphitheater",
        "stadium",
        "hall",
      ];
      const cities = [
        "New York",
        "Los Angeles",
        "Chicago",
        "Austin",
        "Nashville",
        "Seattle",
        "Portland",
        "Denver",
        "Atlanta",
        "Boston",
      ];
      const states = [
        "NY",
        "CA",
        "IL",
        "TX",
        "TN",
        "WA",
        "OR",
        "CO",
        "GA",
        "MA",
      ];

      const cityIndex = i % cities.length;
      const venueType = venueTypes[i % venueTypes.length];

      return {
        name: `${venueType.charAt(0).toUpperCase() + venueType.slice(1)} ${i + 1}`,
        slug: `${venueType}-${i + 1}`,
        city: cities[cityIndex],
        state: states[cityIndex],
        country: "US",
        timezone: "America/New_York",
        capacity: Math.floor(Math.random() * 50000) + 500,
        venueType,
        latitude: 40.7128 + (Math.random() - 0.5) * 20, // Rough US coordinates
        longitude: -74.006 + (Math.random() - 0.5) * 50,
      };
    });

    return await db
      .insert(venues)
      .values(sampleVenues)
      .returning({ id: venues.id, name: venues.name });
  }

  private async seedArtists(count: number): Promise<any[]> {
    const artistNames = [
      "The Electric Dreamers",
      "Neon Nights",
      "Crimson Tide",
      "Silver Shadows",
      "Golden Hour",
      "Midnight Express",
      "Stellar Winds",
      "Ocean Drive",
      "Mountain Echo",
      "Desert Storm",
      "Arctic Monkeys Revival",
      "Cosmic Debris",
      "Radio Static",
      "Velvet Underground 2.0",
      "Glass Animals Tribute",
      "The Strokes Cover Band",
      "Modern Rock Collective",
      "Indie Folk Project",
      "Electronic Fusion",
      "Alternative Edge",
      "Vinyl Records",
      "Cassette Dreams",
      "Digital Harmony",
      "Analog Soul",
      "Synthetic Love",
      "Retro Future",
      "New Wave Revival",
      "Post Punk Kids",
      "Shoegaze Society",
      "Dream Pop Collective",
      "Garage Rock Band",
      "Psych Rock Ensemble",
      "Prog Rock Orchestra",
      "Math Rock Quartet",
      "Art Rock Installation",
      "Ambient Soundscape",
      "Noise Rock Experiment",
      "Lo-Fi Hip Hop",
      "Chillwave Collective",
      "Synthwave Society",
      "Darkwave Underground",
      "Newwave Tomorrow",
      "Coldwave Winter",
      "Minimal Techno",
      "Deep House Project",
      "Acid Jazz Fusion",
      "Nu Soul Revival",
      "Future Funk",
      "Vaporwave Aesthetic",
      "Cyberpunk Orchestra",
    ];

    const genres = [
      ["indie rock", "alternative"],
      ["electronic", "synthwave"],
      ["rock", "classic rock"],
      ["pop", "indie pop"],
      ["hip-hop", "rap"],
      ["jazz", "fusion"],
      ["folk", "indie folk"],
      ["metal", "progressive"],
      ["punk", "post-punk"],
      ["ambient", "experimental"],
    ];

    const sampleArtists = Array.from(
      { length: Math.min(count, artistNames.length) },
      (_, i) => ({
        name: artistNames[i],
        slug: artistNames[i].toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        genres: JSON.stringify(genres[i % genres.length]),
        popularity: Math.floor(Math.random() * 100),
        followers: Math.floor(Math.random() * 1000000),
        followerCount: Math.floor(Math.random() * 10000),
        verified: Math.random() > 0.7,
        bio: `${artistNames[i]} is an innovative music collective pushing the boundaries of their genre.`,
      }),
    );

    return await db
      .insert(artists)
      .values(sampleArtists)
      .returning({ id: artists.id, name: artists.name });
  }

  private async seedSongs(count: number, artistList: any[]): Promise<any[]> {
    const songTitles = [
      "Electric Dreams",
      "Neon Lights",
      "Midnight Drive",
      "City Skyline",
      "Ocean Waves",
      "Mountain High",
      "Desert Road",
      "River Flow",
      "Forest Deep",
      "Sky Blue",
      "Starlight",
      "Moonbeam",
      "Sunshine",
      "Rainbow",
      "Thunder",
      "Lightning",
      "Storm Clouds",
      "Clear Skies",
      "Windy Day",
      "Calm Night",
      "Urban Jungle",
      "Concrete Dreams",
      "Steel and Glass",
      "Neon Signs",
      "Traffic Lights",
      "Subway Ride",
      "Bus Stop",
      "Train Station",
      "Airport Terminal",
      "Highway Exit",
      "Coffee Shop",
      "Bookstore",
      "Record Store",
      "Art Gallery",
      "Concert Hall",
      "Dance Floor",
      "Rooftop Party",
      "Beach Bonfire",
      "Camping Trip",
      "Road Trip",
      "Home Sweet Home",
      "Familiar Faces",
      "Old Friends",
      "New Beginnings",
      "Fresh Start",
      "Second Chances",
      "Third Time",
      "Lucky Number",
      "Golden Ticket",
      "Silver Lining",
    ];

    const sampleSongs = Array.from(
      { length: Math.min(count, songTitles.length) },
      (_, i) => {
        const artist = artistList[i % artistList.length];
        return {
          title: songTitles[i],
          artist: artist.name,
          album: `Album ${Math.floor(i / 10) + 1}`,
          durationMs: Math.floor(Math.random() * 300000) + 120000, // 2-7 minutes
          popularity: Math.floor(Math.random() * 100),
          isExplicit: Math.random() > 0.8,
          isPlayable: true,
        };
      },
    );

    return await db
      .insert(songs)
      .values(sampleSongs)
      .returning({ id: songs.id, title: songs.title });
  }

  private async seedShows(
    count: number,
    artistList: any[],
    venueList: any[],
  ): Promise<any[]> {
    const showNames = [
      "Summer Festival",
      "Winter Concert",
      "Spring Tour",
      "Fall Sessions",
      "Album Release Party",
      "Acoustic Evening",
      "Electric Night",
      "Unplugged Session",
      "Greatest Hits Tour",
      "New Album Showcase",
      "Farewell Concert",
      "Reunion Show",
      "Charity Benefit",
      "Festival Headliner",
      "Late Night Set",
      "Afternoon Acoustic",
      "Birthday Celebration",
      "Anniversary Show",
      "Holiday Special",
      "New Year Concert",
    ];

    const sampleShows = Array.from({ length: count }, (_, i) => {
      const artist = artistList[i % artistList.length];
      const venue = venueList[i % venueList.length];
      const showName = showNames[i % showNames.length];

      // Generate dates between 30 days ago and 90 days in the future
      const baseDate = new Date();
      const daysOffset = Math.floor(Math.random() * 120) - 30;
      const showDate = new Date(
        baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000,
      );

      // const _statuses = ["upcoming", "completed", "cancelled"] as const;
      const status = showDate > new Date() ? "upcoming" : "completed";

      return {
        headlinerArtistId: artist.id,
        venueId: venue.id,
        name: `${artist.name} - ${showName}`,
        slug: `${artist.name}-${showName}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-"),
        date: showDate.toISOString().split("T")[0],
        startTime: `${19 + Math.floor(Math.random() * 3)}:00:00`, // 7-9 PM
        status,
        description: `Join ${artist.name} for an unforgettable ${showName?.toLowerCase() || 'show'} experience.`,
        minPrice: Math.floor(Math.random() * 100) + 25,
        maxPrice: Math.floor(Math.random() * 200) + 100,
        viewCount: Math.floor(Math.random() * 10000),
        attendeeCount: Math.floor(Math.random() * 5000),
        trendingScore: Math.random() * 10,
      };
    });

    return await db
      .insert(shows)
      .values(sampleShows)
      .returning({ id: shows.id, name: shows.name });
  }

  private async seedSetlists(showList: any[], songList: any[]): Promise<any[]> {
    const setlistsArray: any[] = [];

    for (const show of showList) {
      // Each show gets 1-2 setlists
      const setlistCount = Math.random() > 0.7 ? 2 : 1;

      for (let i = 0; i < setlistCount; i++) {
        const setlistName = i === 0 ? "Main Set" : "Encore";
        const type = show.status === "completed" ? "actual" : "predicted";

        const insertedSetlist: any[] = await db
          .insert(setlists)
          .values({
            showId: show.id,
            artistId: show.headlinerArtistId, // This would need to be fetched from the show
            type,
            name: setlistName,
            orderIndex: i,
            isLocked: type === "actual",
          })
          .returning({ id: setlists.id });

        if (insertedSetlist[0]) {
          setlistsArray.push(insertedSetlist[0]);

          // Add songs to the setlist
          const songCount = Math.floor(Math.random() * 15) + 8; // 8-22 songs
          const selectedSongs = this.shuffleArray([...songList]).slice(
            0,
            songCount,
          );

          const setlistSongData = selectedSongs.map((song, index) => ({
            setlistId: insertedSetlist[0].id,
            songId: song.id,
            position: index + 1,
            isPlayed: type === "actual" ? Math.random() > 0.1 : null, // 90% played for actual sets
            upvotes: Math.floor(Math.random() * 50),
            downvotes: Math.floor(Math.random() * 10),
            netVotes: 0, // Will be calculated by trigger
          }));

          await db.insert(setlistSongs).values(setlistSongData);
        }
      }
    }

    return setlistsArray;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async clearDatabase(): Promise<void> {
    // Delete in reverse order of dependencies
    await db.delete(setlistSongs);
    await db.delete(setlists);
    await db.delete(showArtists);
    await db.delete(shows);
    await db.delete(songs);
    await db.delete(venues);
    await db.delete(artists);
  }

  async getSeededDataStats(): Promise<{
    artists: number;
    venues: number;
    shows: number;
    songs: number;
    setlists: number;
    setlistSongs: number;
  }> {
    const [
      artistCount,
      venueCount,
      showCount,
      songCount,
      setlistCount,
      setlistSongCount,
    ] = await Promise.all([
      db.select().from(artists),
      db.select().from(venues),
      db.select().from(shows),
      db.select().from(songs),
      db.select().from(setlists),
      db.select().from(setlistSongs),
    ]);

    return {
      artists: artistCount.length,
      venues: venueCount.length,
      shows: showCount.length,
      songs: songCount.length,
      setlists: setlistCount.length,
      setlistSongs: setlistSongCount.length,
    };
  }
}

// Export singleton instance
export const databaseSeeder = new DatabaseSeeder();

// CLI script for seeding
if (require.main === module) {
  const main = async () => {
    try {
      const args = process.argv.slice(2);
      const operation = args[0] || "seed";

      if (operation === "clear") {
        await databaseSeeder.clearDatabase();
      } else if (operation === "stats") {
        // const _stats = await databaseSeeder.getSeededDataStats();
      } else {
        await databaseSeeder.seedDatabase({
          artists: 30,
          venues: 15,
          shows: 50,
          songs: 100,
          useExternalApis: false,
        });
      }
    } catch (_error) {
      process.exit(1);
    }
  };

  main();
}
