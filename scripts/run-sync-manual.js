#!/usr/bin/env node

/**
 * Manual Sync Script - Run sync operations directly without API endpoints
 * This bypasses the web server and runs the sync logic directly
 */

const { drizzle } = require("drizzle-orm/postgres-js");
const postgres = require("postgres");
const { config } = require("dotenv");
const { resolve } = require("path");
const { existsSync } = require("fs");
const { sql, eq, or, isNull, lte, desc, gte, and } = require("drizzle-orm");

// Load environment variables
const envPaths = [
  resolve(__dirname, "../.env.local"),
  resolve(__dirname, "../apps/web/.env.local"),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: false });
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found");
  process.exit(1);
}

console.log("🔄 MySetlist Manual Sync Script");
console.log("================================");

// Create database connection
const pgClient = postgres(DATABASE_URL, {
  ssl: "require",
  max: 1,
});

const db = drizzle(pgClient);

// Define tables (simplified schema for this script)
const artists = {
  id: "id",
  name: "name",
  slug: "slug",
  spotifyId: "spotify_id",
  ticketmasterId: "ticketmaster_id",
  imageUrl: "image_url",
  genres: "genres",
  popularity: "popularity",
  followers: "followers",
  createdAt: "created_at",
  updatedAt: "updated_at",
  lastSyncedAt: "last_synced_at",
  trendingScore: "trending_score",
};

const shows = {
  id: "id",
  name: "name",
  slug: "slug",
  ticketmasterId: "ticketmaster_id",
  headlinerArtistId: "headliner_artist_id",
  venueId: "venue_id",
  date: "date",
  status: "status",
  ticketUrl: "ticket_url",
  imageUrl: "image_url",
  priceMin: "price_min",
  priceMax: "price_max",
  trendingScore: "trending_score",
  updatedAt: "updated_at",
};

const venues = {
  id: "id",
  name: "name",
  slug: "slug",
  ticketmasterId: "ticketmaster_id",
  city: "city",
  state: "state",
  country: "country",
  address: "address",
  latitude: "latitude",
  longitude: "longitude",
  capacity: "capacity",
};

const userActivityLog = {
  action: "action",
  targetType: "target_type",
  targetId: "target_id",
  details: "details",
  createdAt: "created_at",
};

// Get Spotify access token
async function getSpotifyToken() {
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new Error(`Spotify auth failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Failed to get Spotify token:", error);
    return null;
  }
}

// Discover artists from Spotify
async function discoverSpotifyArtists(token, limit = 10) {
  try {
    console.log("🎵 Discovering artists from Spotify...");
    const discoveredArtists = [];

    // Get artists from Global Top 50 playlist
    const playlistId = "37i9dQZEVXbMDoHDwVN2tF"; // Global Top 50
    const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=20`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify playlist error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.items) {
      for (const item of data.items) {
        if (item.track?.artists) {
          for (const artist of item.track.artists) {
            discoveredArtists.push({
              spotifyId: artist.id,
              name: artist.name,
              source: "spotify",
            });
          }
        }
      }
    }

    // Deduplicate and get full artist details
    const uniqueArtists = Array.from(
      new Map(discoveredArtists.map((a) => [a.spotifyId, a])).values(),
    );

    const detailedArtists = [];
    for (const artist of uniqueArtists.slice(0, limit)) {
      try {
        const response = await fetch(
          `https://api.spotify.com/v1/artists/${artist.spotifyId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.ok) {
          const fullArtist = await response.json();
          detailedArtists.push({
            spotifyId: fullArtist.id,
            name: fullArtist.name,
            imageUrl: fullArtist.images?.[0]?.url,
            genres: fullArtist.genres,
            popularity: fullArtist.popularity,
            followers: fullArtist.followers?.total,
            source: "spotify",
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching artist ${artist.spotifyId}:`, error);
      }
    }

    console.log(`  Found ${detailedArtists.length} unique artists`);
    return detailedArtists;
  } catch (error) {
    console.error("Spotify discovery error:", error);
    return [];
  }
}

// Add discovered artists to database
async function addDiscoveredArtists(discoveredArtists, source) {
  let added = 0;
  let errors = 0;

  console.log(
    `📥 Adding ${discoveredArtists.length} ${source} artists to database...`,
  );

  for (const artist of discoveredArtists) {
    try {
      // Check if artist already exists
      const existing = await pgClient`
        SELECT id FROM artists 
        WHERE spotify_id = ${artist.spotifyId} 
        OR name = ${artist.name}
        LIMIT 1
      `;

      if (existing.length === 0) {
        // Create slug from name
        const slug = artist.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        // Insert new artist
        await pgClient`
          INSERT INTO artists (
            name, slug, spotify_id, image_url, genres, 
            popularity, followers, created_at, updated_at
          ) VALUES (
            ${artist.name}, 
            ${slug}, 
            ${artist.spotifyId}, 
            ${artist.imageUrl || null}, 
            ${artist.genres ? JSON.stringify(artist.genres) : null}, 
            ${artist.popularity || 0}, 
            ${artist.followers || 0}, 
            NOW(), 
            NOW()
          )
        `;

        added++;
        console.log(`  ✅ Added: ${artist.name}`);

        // Log discovery
        await pgClient`
          INSERT INTO user_activity_log (
            action, target_type, details, created_at
          ) VALUES (
            'artist_discovered', 
            'artist', 
            ${JSON.stringify({
              source,
              artistName: artist.name,
              metadata: artist,
            })}, 
            NOW()
          )
        `;
      } else {
        console.log(`  ⏭️  Skipped: ${artist.name} (already exists)`);
      }
    } catch (error) {
      console.error(`  ❌ Error adding artist ${artist.name}:`, error);
      errors++;
    }
  }

  console.log(`  📊 Results: ${added} added, ${errors} errors`);
  return { added, errors };
}

// Calculate trending scores
async function calculateTrendingScores() {
  console.log("📈 Calculating trending scores...");

  try {
    // Update artist trending scores
    const artistsResult = await pgClient`
      UPDATE artists 
      SET trending_score = (
        COALESCE(popularity, 0) * 0.3 +
        COALESCE(followers, 0) / 10000 * 0.4 +
        RANDOM() * 20 * 0.3
      ),
      updated_at = NOW()
      WHERE spotify_id IS NOT NULL
    `;

    console.log(`  ✅ Updated ${artistsResult.count} artist trending scores`);

    // Update show trending scores
    const showsResult = await pgClient`
      UPDATE shows 
      SET trending_score = (
        COALESCE(vote_count, 0) * 2 +
        COALESCE(view_count, 0) * 0.5 +
        COALESCE(attendee_count, 0) * 1.5 +
        RANDOM() * 10
      ),
      updated_at = NOW()
      WHERE status IN ('upcoming', 'ongoing')
    `;

    console.log(`  ✅ Updated ${showsResult.count} show trending scores`);

    return {
      artists: artistsResult.count,
      shows: showsResult.count,
    };
  } catch (error) {
    console.error("❌ Error calculating trending scores:", error);
    return { artists: 0, shows: 0 };
  }
}

// Get trending data
async function getTrendingData() {
  console.log("📊 Getting trending data...");

  try {
    const trendingArtists = await pgClient`
      SELECT id, name, trending_score, popularity, followers
      FROM artists 
      WHERE trending_score > 0 
      ORDER BY trending_score DESC 
      LIMIT 10
    `;

    const trendingShows = await pgClient`
      SELECT s.id, s.name, s.trending_score, a.name as artist_name
      FROM shows s
      LEFT JOIN artists a ON s.headliner_artist_id = a.id
      WHERE s.trending_score > 0 
      ORDER BY s.trending_score DESC 
      LIMIT 10
    `;

    console.log("📈 Top Trending Artists:");
    trendingArtists.forEach((artist, i) => {
      console.log(
        `  ${i + 1}. ${artist.name} (score: ${artist.trending_score?.toFixed(2)})`,
      );
    });

    console.log("🎭 Top Trending Shows:");
    trendingShows.forEach((show, i) => {
      console.log(
        `  ${i + 1}. ${show.name} by ${show.artist_name} (score: ${show.trending_score?.toFixed(2)})`,
      );
    });

    return {
      artists: trendingArtists.length,
      shows: trendingShows.length,
    };
  } catch (error) {
    console.error("❌ Error getting trending data:", error);
    return { artists: 0, shows: 0 };
  }
}

async function main() {
  try {
    console.log("🚀 Starting manual sync process...\n");

    // 1. Get Spotify token
    const spotifyToken = await getSpotifyToken();
    if (!spotifyToken) {
      throw new Error("Failed to get Spotify token");
    }
    console.log("✅ Spotify token obtained\n");

    // 2. Discover artists from Spotify
    const spotifyArtists = await discoverSpotifyArtists(spotifyToken, 5);

    // 3. Add artists to database
    if (spotifyArtists.length > 0) {
      await addDiscoveredArtists(spotifyArtists, "spotify");
    }

    console.log();

    // 4. Calculate trending scores
    const trendingResults = await calculateTrendingScores();

    console.log();

    // 5. Show trending data
    const trendingData = await getTrendingData();

    console.log("\n🎉 Manual sync completed successfully!");
    console.log(
      `📈 Trending: ${trendingData.artists} artists, ${trendingData.shows} shows`,
    );
  } catch (error) {
    console.error("\n💥 Manual sync failed:", error.message);
    process.exit(1);
  } finally {
    await pgClient.end();
  }
}

main().catch(console.error);
