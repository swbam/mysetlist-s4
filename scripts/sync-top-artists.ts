#!/usr/bin/env tsx
/**
 * Script to sync top 5 US artists with upcoming shows, venues, and song catalogs
 * Uses real data from Ticketmaster and Spotify APIs
 */

import "dotenv/config";
// Import from the actual files that have the exports
const { ticketmaster } = await import(
  "../packages/external-apis/src/ticketmaster"
);
const { spotify } = await import("../packages/external-apis/src/spotify");

// Check for required environment variables
const requiredEnvVars = [
  "TICKETMASTER_API_KEY",
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const APP_URL = process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3001";

// Top 5 trending artists in the US with upcoming shows (as of 2024)
const TOP_US_ARTISTS = [
  { name: "Taylor Swift", spotifyId: "06HL4z0CvFAxyc27GXpf02" },
  { name: "Drake", spotifyId: "3TVXtAsR1Inumwj472S9r4" },
  { name: "Bad Bunny", spotifyId: "4q3ewBCX7sLwd24euuV69X" },
  { name: "The Weeknd", spotifyId: "1Xyo4u8uXC1ZmMpatF05PJ" },
  { name: "Post Malone", spotifyId: "246dkjvS1zLTtiykXe5h60" },
];

async function syncArtistData(artist: { name: string; spotifyId: string }) {
  try {
    console.log(`\n🎤 Syncing ${artist.name}...`);

    // 1. Sync artist data from Spotify
    console.log(`  📡 Fetching artist data from Spotify...`);
    const spotifyArtist = await spotify.getArtist(artist.spotifyId);

    // Create/update artist via API
    const artistResponse = await fetch(`${APP_URL}/api/artists/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-supabase-service-role": process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
      },
      body: JSON.stringify({
        spotifyId: artist.spotifyId,
        artistName: artist.name,
        imageUrl: spotifyArtist.images[0]?.url,
        genres: spotifyArtist.genres,
        popularity: spotifyArtist.popularity,
        followers: spotifyArtist.followers.total,
      }),
    });

    if (!artistResponse.ok) {
      throw new Error(`Failed to sync artist: ${await artistResponse.text()}`);
    }

    const artistData = await artistResponse.json();
    console.log(`  ✅ Artist synced: ${artistData.artist.name}`);

    // 2. Sync upcoming shows from Ticketmaster
    console.log(`  📅 Fetching upcoming shows from Ticketmaster...`);
    const upcomingEvents = await ticketmaster.getUpcomingEvents(artist.name, {
      size: 10,
      startDateTime: new Date().toISOString(),
      endDateTime: new Date(
        Date.now() + 180 * 24 * 60 * 60 * 1000,
      ).toISOString(), // Next 6 months
    });

    console.log(`  📍 Found ${upcomingEvents.length} upcoming shows`);

    // Sync shows and venues
    for (const event of upcomingEvents) {
      if (!event._embedded?.venues?.[0]) continue;

      const venue = event._embedded.venues[0];

      // Create/update venue
      const venueResponse = await fetch(`${APP_URL}/api/venues/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-supabase-service-role": process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
        },
        body: JSON.stringify({
          ticketmasterId: venue.id,
          name: venue.name,
          city: venue.city?.name || "Unknown",
          state: venue.state?.name,
          country: venue.country?.name || "USA",
          latitude: venue.location?.latitude
            ? Number.parseFloat(venue.location.latitude)
            : null,
          longitude: venue.location?.longitude
            ? Number.parseFloat(venue.location.longitude)
            : null,
          timezone: venue.timezone || "America/New_York",
          capacity: venue.capacity,
        }),
      });

      if (!venueResponse.ok) {
        console.error(`  ⚠️  Failed to sync venue: ${venue.name}`);
        continue;
      }

      const venueData = await venueResponse.json();

      // Create/update show
      const showResponse = await fetch(`${APP_URL}/api/shows/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-supabase-service-role": process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
        },
        body: JSON.stringify({
          ticketmasterId: event.id,
          name: event.name,
          date: event.dates.start.localDate,
          startTime: event.dates.start.localTime || "20:00:00",
          headlinerArtistId: artistData.artist.id,
          venueId: venueData.venue.id,
          ticketUrl: event.url,
          status: "upcoming",
        }),
      });

      if (!showResponse.ok) {
        console.error(`  ⚠️  Failed to sync show: ${event.name}`);
      }
    }

    // 3. Sync song catalog
    console.log(`  🎵 Fetching song catalog from Spotify...`);

    // Get top tracks
    const topTracks = await spotify.getArtistTopTracks(artist.spotifyId);
    console.log(`  🎶 Found ${topTracks.length} top tracks`);

    // Get albums and their tracks
    const albums = await spotify.getArtistAlbums(artist.spotifyId, 10);
    let totalSongs = topTracks.length;

    for (const album of albums) {
      try {
        const albumTracks = await spotify.getAlbumTracks(album.id);
        totalSongs += albumTracks.length;

        // Sync songs from this album
        for (const track of albumTracks.slice(0, 5)) {
          // Limit to 5 songs per album
          await fetch(`${APP_URL}/api/songs/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-supabase-service-role":
                process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
            },
            body: JSON.stringify({
              spotifyId: track.id,
              title: track.name,
              artist: artist.name,
              artistId: artistData.artist.id,
              album: album.name,
              albumArtUrl: album.images[0]?.url,
              releaseDate: album.release_date,
              durationMs: track.duration_ms,
              previewUrl: track.preview_url,
              popularity: track.popularity || 50,
            }),
          });
        }
      } catch (error) {
        console.error(`  ⚠️  Failed to sync album ${album.name}:`, error);
      }
    }

    console.log(`  ✅ Synced ${totalSongs} songs for ${artist.name}`);

    // 4. Update trending score
    await fetch(`${APP_URL}/api/artists/${artistData.artist.id}/trending`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-supabase-service-role": process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
      },
      body: JSON.stringify({
        trendingScore: spotifyArtist.popularity,
        monthlyListeners: spotifyArtist.followers.total,
      }),
    });

    return true;
  } catch (error) {
    console.error(`❌ Failed to sync ${artist.name}:`, error);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting sync of top 5 US artists with upcoming shows...\n");

  let successCount = 0;

  for (const artist of TOP_US_ARTISTS) {
    const success = await syncArtistData(artist);
    if (success) {
      successCount++;
    }

    // Add delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(
    `\n✨ Sync complete! Successfully synced ${successCount}/${TOP_US_ARTISTS.length} artists.`,
  );

  if (successCount === TOP_US_ARTISTS.length) {
    console.log("\n🎉 All artists synced successfully!");
    console.log("📊 You can now run trending update: pnpm run update:trending");
  } else {
    console.log(
      "\n⚠️  Some artists failed to sync. Check the logs above for details.",
    );
  }
}

// Run the script
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
