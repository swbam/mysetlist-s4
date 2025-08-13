import { db } from "@repo/database";
import { artists } from "@repo/database";
import { SpotifyClient, TicketmasterClient } from "@repo/external-apis";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

async function fetchAttraction(tmId: string) {
  const tmClient = new TicketmasterClient({
    apiKey: process.env["TICKETMASTER_API_KEY"] || "",
  });
  return await tmClient.getAttraction(tmId);
}

// Enhanced function to fetch comprehensive artist data
async function fetchSpotifyData(artistName: string): Promise<any> {
  try {
    const spotify = new SpotifyClient({});
    await spotify.authenticate();

    // Search for artist
    const searchResults = await spotify.searchArtists(artistName, 1);
    if (searchResults.artists.items.length === 0) {
      return null;
    }

    const spotifyArtist = searchResults.artists.items[0];
    if (!spotifyArtist) {
      return null;
    }

    // Get additional data
    const [topTracks, albums] = await Promise.all([
      spotify
        .getArtistTopTracks(spotifyArtist.id)
        .catch(() => ({ tracks: [] })),
      spotify
        .getArtistAlbums(spotifyArtist.id, { include_groups: "album,single" })
        .catch(() => ({ items: [] })),
    ]);

    return {
      artist: spotifyArtist,
      topTracks: topTracks.tracks || [],
      albums: albums.items || [],
    };
  } catch (error) {
    console.error("Failed to fetch Spotify data:", error);
    return null;
  }
}

export async function upsertArtistEnhanced(tmId: string) {
  console.log(`Starting enhanced upsert for Ticketmaster ID: ${tmId}`);

  // Fetch artist data from Ticketmaster
  const attraction = await fetchAttraction(tmId);
  console.log(`Fetched Ticketmaster data for: ${attraction.name}`);

  // Fetch additional data from Spotify
  const spotifyData = await fetchSpotifyData(attraction.name);
  if (spotifyData) {
    console.log(
      `Fetched Spotify data for: ${spotifyData.artist.name} (${spotifyData.artist.popularity} popularity)`,
    );
  }

  // Check if artist already exists by Ticketmaster ID
  const existingArtist = await db
    .select()
    .from(artists)
    .where(eq(artists.ticketmasterId, tmId))
    .limit(1);

  if (existingArtist.length > 0) {
    console.log(`Updating existing artist: ${attraction.name}`);

    const updateData: any = {
      name: attraction.name,
      imageUrl: attraction.images?.[0]?.url || null,
      smallImageUrl:
        attraction.images?.find((img: any) => img.width < 500)?.url || null,
      genres: JSON.stringify(extractGenres(attraction)),
      updatedAt: new Date(),
      lastSyncedAt: new Date(),
    };

    // Add Spotify data if available
    if (spotifyData?.artist) {
      updateData.spotifyId = spotifyData.artist.id;
      updateData.popularity = spotifyData.artist.popularity;
      updateData.followers = spotifyData.artist.followers.total;
      updateData.externalUrls = JSON.stringify(
        spotifyData.artist.external_urls,
      );
      updateData.totalAlbums = spotifyData.albums?.length || 0;
      updateData.songCatalogSyncedAt = new Date();
      updateData.lastFullSyncAt = new Date();

      // Use Spotify images if better quality available
      if (spotifyData.artist.images?.[0]?.url) {
        updateData.imageUrl = spotifyData.artist.images[0].url;
        updateData.smallImageUrl =
          spotifyData.artist.images.find((img: any) => img.width < 500)?.url ||
          spotifyData.artist.images[spotifyData.artist.images.length - 1]?.url;
      }

      // Merge genres from both sources
      const tmGenres = extractGenres(attraction);
      const spotifyGenres = spotifyData.artist.genres || [];
      const allGenres = [...new Set([...tmGenres, ...spotifyGenres])];
      updateData.genres = JSON.stringify(allGenres);

      console.log(
        `Enhanced with Spotify: ${spotifyData.artist.followers.total} followers, ${allGenres.length} genres`,
      );
    }

    // Update existing artist
    await db
      .update(artists)
      .set(updateData)
      .where(eq(artists.ticketmasterId, tmId));

    console.log(`Successfully updated artist: ${attraction.name}`);
    return existingArtist[0];
  }

  // Create new artist with comprehensive data
  const slug = await generateUniqueSlug(attraction.name);
  console.log(`Creating new artist with slug: ${slug}`);

  const newArtist: any = {
    id: nanoid(),
    name: attraction.name,
    slug,
    ticketmasterId: tmId,
    mbid: null,
    imageUrl: attraction.images?.[0]?.url || null,
    smallImageUrl:
      attraction.images?.find((img: any) => img.width < 500)?.url || null,
    genres: JSON.stringify(extractGenres(attraction)),
    verified: false,
    popularity: 0,
    followers: 0,
    followerCount: 0,
    monthlyListeners: null,
    // bio removed
    externalUrls: null,
    lastSyncedAt: new Date(),
    songCatalogSyncedAt: null,
    totalAlbums: 0,
    totalSongs: 0,
    lastFullSyncAt: null,
    previousFollowers: null,
    previousPopularity: null,
    previousMonthlyListeners: null,
    previousFollowerCount: null,
    lastGrowthCalculated: null,
    trendingScore: 0,
    totalShows: 0,
    upcomingShows: 0,
    totalSetlists: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Add Spotify data if available
  if (spotifyData?.artist) {
    newArtist.spotifyId = spotifyData.artist.id;
    newArtist.popularity = spotifyData.artist.popularity;
    newArtist.followers = spotifyData.artist.followers.total;
    newArtist.externalUrls = JSON.stringify(spotifyData.artist.external_urls);
    newArtist.totalAlbums = spotifyData.albums?.length || 0;
    newArtist.songCatalogSyncedAt = new Date();
    newArtist.lastFullSyncAt = new Date();

    // Use Spotify images if better quality available
    if (spotifyData.artist.images?.[0]?.url) {
      newArtist.imageUrl = spotifyData.artist.images[0].url;
      newArtist.smallImageUrl =
        spotifyData.artist.images.find((img: any) => img.width < 500)?.url ||
        spotifyData.artist.images[spotifyData.artist.images.length - 1]?.url;
    }

    // Merge genres from both sources
    const tmGenres = extractGenres(attraction);
    const spotifyGenres = spotifyData.artist.genres || [];
    const allGenres = [...new Set([...tmGenres, ...spotifyGenres])];
    newArtist.genres = JSON.stringify(allGenres);

    console.log(
      `Enhanced new artist with Spotify: ${spotifyData.artist.followers.total} followers, ${allGenres.length} genres`,
    );
  }

  await db.insert(artists).values(newArtist);
  console.log(`Successfully created new artist: ${attraction.name}`);

  return newArtist;
}

function extractGenres(attraction: any): string[] {
  const genres: string[] = [];

  if (attraction.classifications) {
    for (const classification of attraction.classifications) {
      if (
        classification.genre?.name &&
        classification.genre.name !== "Undefined"
      ) {
        genres.push(classification.genre.name);
      }
      if (
        classification.subGenre?.name &&
        classification.subGenre.name !== "Undefined"
      ) {
        genres.push(classification.subGenre.name);
      }
    }
  }

  // Remove duplicates
  return [...new Set(genres)];
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Generate unique slug by checking for existing ones
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db
      .select()
      .from(artists)
      .where(eq(artists.slug, slug))
      .limit(1);

    if (existing.length === 0) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// Legacy export for backward compatibility
export { upsertArtistEnhanced as upsertArtist };
