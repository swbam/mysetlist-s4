import { createServiceClient } from "~/lib/supabase/server";
import { ticketmaster } from "@repo/external-apis";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "~/lib/cache";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketmasterId, artistName, imageUrl, genres } = body;

    if (!ticketmasterId && !artistName) {
      return NextResponse.json(
        { error: "Either ticketmasterId or artistName is required" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Unable to connect to database" },
        { status: 500 }
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
        `slug.eq.${slug}${ticketmasterId ? `,ticketmaster_id.eq.${ticketmasterId}` : ""}`
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
        { status: 200 }
      );
    }

    // Try to get more data from Ticketmaster if we have the ID
    let artistData: any = {
      name: artistName,
      slug,
      image_url: imageUrl,
      genres: JSON.stringify(genres || []),
      ticketmaster_id: ticketmasterId,
      verified: false,
      popularity: 0,
    };

    if (ticketmasterId) {
      try {
        const tmArtist = await ticketmaster.getArtistDetails(ticketmasterId);
        if (tmArtist) {
          artistData = {
            ...artistData,
            name: tmArtist.name || artistName,
            image_url: tmArtist.imageUrl || imageUrl,
            genres: JSON.stringify(tmArtist.genres || genres || []),
            popularity: tmArtist.popularity || 0,
          };
        }
      } catch (error) {
        console.warn("Failed to fetch additional Ticketmaster data:", error);
      }
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
        { status: 500 }
      );
    }

    // Revalidate cache
    revalidateTag(CACHE_TAGS.artists);

    // Trigger background sync for additional data (shows, etc.)
    if (ticketmasterId) {
      // Fire and forget - sync artist shows
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "artist",
          artistId: newArtist.id,
          ticketmasterId,
        }),
      }).catch((error) => {
        console.warn("Background sync failed:", error);
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
      { status: 201 }
    );
  } catch (error) {
    console.error("Import API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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
      { status: 400 }
    );
  }

  try {
    // For GET requests, just check if artist exists or needs import
    const supabase = await createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Unable to connect to database" },
        { status: 500 }
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
        }`
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
      { status: 500 }
    );
  }
}