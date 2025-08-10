const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Spotify credentials
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

async function getSpotifyToken() {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET).toString(
          "base64",
        ),
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  return data.access_token;
}

async function getSpotifyArtist(spotifyId, token) {
  const response = await fetch(
    `https://api.spotify.com/v1/artists/${spotifyId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) return null;
  return await response.json();
}

async function syncArtistImages() {
  console.log("Starting artist image sync from Spotify...");

  // Get Spotify token
  const token = await getSpotifyToken();
  console.log("Got Spotify token");

  // Get all artists with Spotify IDs but no images
  const { data: artists, error } = await supabase
    .from("artists")
    .select("id, name, spotify_id")
    .not("spotify_id", "is", null)
    .is("image_url", null);

  if (error) {
    console.error("Error fetching artists:", error);
    return;
  }

  console.log(`Found ${artists.length} artists without images`);

  let updated = 0;
  for (const artist of artists) {
    try {
      console.log(`Fetching images for ${artist.name}...`);
      const spotifyData = await getSpotifyArtist(artist.spotify_id, token);

      if (spotifyData && spotifyData.images && spotifyData.images.length > 0) {
        const largeImage = spotifyData.images[0]?.url;
        const smallImage =
          spotifyData.images[spotifyData.images.length - 1]?.url;

        const { error: updateError } = await supabase
          .from("artists")
          .update({
            image_url: largeImage,
            small_image_url: smallImage,
            popularity: spotifyData.popularity || 0,
            followers: spotifyData.followers?.total || 0,
            genres: spotifyData.genres || [],
          })
          .eq("id", artist.id);

        if (updateError) {
          console.error(`Error updating ${artist.name}:`, updateError);
        } else {
          console.log(`✓ Updated ${artist.name} with images`);
          updated++;
        }
      } else {
        console.log(`✗ No images found for ${artist.name}`);
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err) {
      console.error(`Error processing ${artist.name}:`, err);
    }
  }

  console.log(`\nSync complete! Updated ${updated} artists with images.`);
}

syncArtistImages().catch(console.error);
