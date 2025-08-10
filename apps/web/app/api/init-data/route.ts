import { db } from "@repo/database";
import { artists, shows, venues } from "@repo/database";
import { SpotifyClient } from "@repo/external-apis";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// One-time initialization endpoint to populate initial data
export async function POST(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = {
      artists: 0,
      venues: 0,
      shows: 0,
      timestamp: new Date().toISOString(),
    };

    // Initialize Spotify client
    const spotify = new SpotifyClient({});
    await spotify.authenticate();

    // Popular artists to seed the database
    const popularArtists = [
      { name: "Taylor Swift", spotifyId: "06HL4z0CvFAxyc27GXpf02" },
      { name: "Drake", spotifyId: "3TVXtAsR1Inumwj472S9r4" },
      { name: "Bad Bunny", spotifyId: "4q3ewBCX7sLwd24euuV69X" },
      { name: "The Weeknd", spotifyId: "1Xyo4u8uXC1ZmMpatF05PJ" },
      { name: "Billie Eilish", spotifyId: "6qqNVTkY8uBg9cP3Jd7DAH" },
      { name: "Post Malone", spotifyId: "246dkjvS1zLTtiykXe5h60" },
      { name: "Dua Lipa", spotifyId: "6M2wZ9GZgrQXHCFfjv46we" },
      { name: "Olivia Rodrigo", spotifyId: "1McMsnEElThX1knmY4oliG" },
      { name: "Arctic Monkeys", spotifyId: "7Ln80lUS6He07XvHI8qqHH" },
      { name: "Twenty One Pilots", spotifyId: "3YQKmKGau1PzlVlkL1iodx" },
      { name: "Imagine Dragons", spotifyId: "53XhwfbYqKCa1cC15pYq2q" },
      { name: "Coldplay", spotifyId: "4gzpq5DPGxSnKTe4SA8HAU" },
      { name: "Ed Sheeran", spotifyId: "6eUKZXaKkcviH0Ku9w2n3V" },
      { name: "Maroon 5", spotifyId: "04gDigrS5kc9YWfZTwkOV" },
      { name: "OneRepublic", spotifyId: "5Pwc4xIPtQLFEnJriah9YJ" },
      { name: "Panic! At The Disco", spotifyId: "20JZFwl6HVl6yg8a4H3ZqK" },
      { name: "Fall Out Boy", spotifyId: "4UXqAaa6dQYAk18Lv7PEgX" },
      { name: "Paramore", spotifyId: "74ASZWbe4lXaubB36ztrGX" },
      { name: "The 1975", spotifyId: "3mIj9lX2MWuHmhNCA7LSCW" },
      { name: "Tame Impala", spotifyId: "5INjqkS1o8h1imAzPqGZBb" },
    ];

    // Insert artists
    for (const artistData of popularArtists) {
      try {
        const spotifyArtist = await spotify.getArtist(artistData.spotifyId);

        await db
          .insert(artists)
          .values({
            spotifyId: spotifyArtist.id,
            name: spotifyArtist.name,
            slug: spotifyArtist.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            imageUrl: spotifyArtist.images[0]?.url || null,
            smallImageUrl:
              spotifyArtist.images[2]?.url ||
              spotifyArtist.images[1]?.url ||
              null,
            genres: JSON.stringify(spotifyArtist.genres),
            popularity: spotifyArtist.popularity,
            followers: spotifyArtist.followers.total,
            followerCount: spotifyArtist.followers.total,
            verified: true,
            externalUrls: JSON.stringify(spotifyArtist.external_urls),
            lastSyncedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: artists.spotifyId,
            set: {
              popularity: spotifyArtist.popularity,
              followers: spotifyArtist.followers.total,
              followerCount: spotifyArtist.followers.total,
              updatedAt: new Date(),
            },
          });

        results.artists++;
      } catch (error) {
        console.error(`Error inserting artist ${artistData.name}:`, error);
      }
    }

    // Insert some popular venues
    const popularVenues = [
      {
        name: "Madison Square Garden",
        city: "New York",
        state: "NY",
        country: "US",
        capacity: 20789,
        latitude: 40.7505,
        longitude: -73.9934,
      },
      {
        name: "The Forum",
        city: "Los Angeles",
        state: "CA",
        country: "US",
        capacity: 17505,
        latitude: 33.9583,
        longitude: -118.3417,
      },
      {
        name: "United Center",
        city: "Chicago",
        state: "IL",
        country: "US",
        capacity: 23500,
        latitude: 41.8807,
        longitude: -87.6742,
      },
      {
        name: "TD Garden",
        city: "Boston",
        state: "MA",
        country: "US",
        capacity: 19580,
        latitude: 42.3662,
        longitude: -71.0621,
      },
      {
        name: "Barclays Center",
        city: "Brooklyn",
        state: "NY",
        country: "US",
        capacity: 19000,
        latitude: 40.6826,
        longitude: -73.9754,
      },
    ];

    for (const venueData of popularVenues) {
      try {
        await db
          .insert(venues)
          .values({
            ...venueData,
            slug: venueData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          })
          .onConflictDoNothing();

        results.venues++;
      } catch (error) {
        console.error(`Error inserting venue ${venueData.name}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Initial data populated successfully",
      results,
    });
  } catch (error) {
    console.error("Init data error:", error);
    return NextResponse.json(
      {
        error: "Failed to initialize data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
