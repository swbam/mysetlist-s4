import { spotify, setlistfm, ticketmaster } from "@repo/external-apis";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { CACHE_TAGS } from "~/lib/cache";
import { createServiceClient } from "~/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketmasterId, artistName, imageUrl, genres } = body;

    if (!ticketmasterId && !artistName) {
      return NextResponse.json(
        { error: "Either ticketmasterId or artistName is required" },
        { status: 400 },
      );
    }

    const supabase = await createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Unable to connect to database" },
        { status: 500 },
      );
    }

    // Generate slug from artist name
    const slug = artistName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if artist already exists by slug or ticketmaster ID
    const { data: existingArtist } = await supabase
      .from("artists")
      .select("*")
      .or(
        `slug.eq.${slug}${ticketmasterId ? `,ticketmaster_id.eq.${ticketmasterId}` : ""}`,
      )
      .single();

    if (existingArtist) {
      return NextResponse.json(
        {
          artist: {
            id: existingArtist.id,
            slug: existingArtist.slug,
            name: existingArtist.name,
          },
          imported: false,
          message: "Artist already exists",
        },
        { status: 200 },
      );
    }

    // Initialize artist data
    let artistData: any = {
      name: artistName,
      slug,
      imageUrl: imageUrl,
      genres: JSON.stringify(genres || []),
      ticketmasterId: ticketmasterId,
      verified: false,
      popularity: 0,
    };

    // Fetch and integrate data from external APIs
    if (ticketmasterId) {
      try {
        const tmArtist = await ticketmaster.getArtistDetails(ticketmasterId);
        if (tmArtist) {
          artistData = {
            ...artistData,
            name: tmArtist.name || artistName,
            imageUrl: tmArtist.imageUrl || imageUrl,
            genres: JSON.stringify(tmArtist.genres || genres || []),
            popularity: tmArtist.popularity || 0,
          };
        }
      } catch (error) {
        console.warn("Failed to fetch additional Ticketmaster data:", error);
      }
    }

    // Try to find and set Spotify ID
    try {
      await spotify.authenticate();
      const spotifyResults = await spotify.searchArtists(artistName, 1);
      if (spotifyResults.artists.items.length > 0) {
        const spotifyArtist = spotifyResults.artists.items[0];
        if (spotifyArtist) {
          artistData.spotifyId = spotifyArtist.id;
          
          // Use Spotify data if we don't have better data
          if (!artistData.imageUrl && spotifyArtist.images[0]) {
            artistData.imageUrl = spotifyArtist.images[0].url;
          }
          if (!artistData.smallImageUrl && spotifyArtist.images[1]) {
            artistData.smallImageUrl = spotifyArtist.images[1].url;
          }
          if (spotifyArtist.genres.length > 0 && (!genres || genres.length === 0)) {
            artistData.genres = JSON.stringify(spotifyArtist.genres);
          }
          artistData.followers = spotifyArtist.followers.total;
          artistData.popularity = Math.max(artistData.popularity || 0, spotifyArtist.popularity);
          artistData.externalUrls = JSON.stringify(spotifyArtist.external_urls);
        }
      }
    } catch (error) {
      console.warn("Failed to fetch Spotify data:", error);
    }

    // Try to find and set Setlist.fm MBID
    try {
      const setlistResults = await setlistfm.searchArtists(artistName, 1);
      if (setlistResults.artist && setlistResults.artist.length > 0) {
        artistData.mbid = setlistResults.artist[0].mbid;
      }
    } catch (error) {
      console.warn("Failed to fetch Setlist.fm data:", error);
    }

    // Insert the new artist
    const { data: newArtist, error: insertError } = await supabase
      .from("artists")
      .insert([artistData])
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert artist:", insertError);
      return NextResponse.json(
        { error: "Failed to create artist" },
        { status: 500 },
      );
    }

    // Revalidate cache
    revalidateTag(CACHE_TAGS.artists);

    // Trigger comprehensive sync orchestration for all external services
    if (newArtist.id) {
      // Fire and forget - sync artist with all external services
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sync`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : "",
        },
        body: JSON.stringify({
          type: "artist",
          artistId: newArtist.id,
          ticketmasterId: newArtist.ticketmasterId,
          spotifyId: newArtist.spotifyId,
          options: {
            syncSongs: true,
            syncShows: true,
            syncSetlists: true,
            createDefaultSetlists: true,
            fullDiscography: true,
          },
        }),
      }).catch((error) => {
        console.warn("Background sync orchestration failed:", error);
      });
    }

    return NextResponse.json(
      {
        artist: {
          id: newArtist.id,
          slug: newArtist.slug,
          name: newArtist.name,
        },
        imported: true,
        message: "Artist imported successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Import API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticketmasterId = searchParams.get("ticketmaster");
  const artistName = searchParams.get("name");

  if (!ticketmasterId && !artistName) {
    return NextResponse.json(
      { error: "Either ticketmaster ID or artist name is required" },
      { status: 400 },
    );
  }

  try {
    // For GET requests, just check if artist exists or needs import
    const supabase = await createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Unable to connect to database" },
        { status: 500 },
      );
    }

    const slug = artistName
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data: existingArtist } = await supabase
      .from("artists")
      .select("*")
      .or(
        `${slug ? `slug.eq.${slug}` : ""}${
          ticketmasterId
            ? `${slug ? "," : ""}ticketmaster_id.eq.${ticketmasterId}`
            : ""
        }`,
      )
      .single();

    if (existingArtist) {
      return NextResponse.json({
        exists: true,
        artist: {
          id: existingArtist.id,
          slug: existingArtist.slug,
          name: existingArtist.name,
        },
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("Import check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
