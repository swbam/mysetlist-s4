import { createSupabaseAdminClient } from "@repo/database"
import { type NextRequest, NextResponse } from "next/server"
import { generateSlug } from "../../../../lib/utils/slug"

interface ImportTicketmasterArtistRequest {
  ticketmasterId: string
  name: string
  imageUrl?: string
  genres?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: ImportTicketmasterArtistRequest = await request.json()
    const { ticketmasterId, name, imageUrl, genres } = body

    if (!ticketmasterId || !name) {
      return NextResponse.json(
        { error: "ticketmasterId and name are required" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // Check if artist already exists by Ticketmaster ID
    const { data: existingArtist } = await supabase
      .from("artists")
      .select("*")
      .eq("ticketmaster_id", ticketmasterId)
      .single()

    if (existingArtist) {
      return NextResponse.json({
        success: true,
        artist: {
          id: existingArtist.id,
          name: existingArtist.name,
          slug: existingArtist.slug,
          ticketmasterId: existingArtist.ticketmaster_id,
          imageUrl: existingArtist.image_url,
          genres: existingArtist.genres,
          isNew: false,
        },
      })
    }

    // Check if artist exists by name (case-insensitive)
    const { data: artistByName } = await supabase
      .from("artists")
      .select("*")
      .ilike("name", name)
      .single()

    if (artistByName) {
      // Update the existing artist with Ticketmaster ID
      const { data: updatedArtist, error: updateError } = await supabase
        .from("artists")
        .update({
          ticketmaster_id: ticketmasterId,
          image_url: imageUrl || artistByName.image_url,
          genres: genres && genres.length > 0 ? genres : artistByName.genres,
          updated_at: new Date().toISOString(),
        })
        .eq("id", artistByName.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        artist: {
          id: updatedArtist.id,
          name: updatedArtist.name,
          slug: updatedArtist.slug,
          ticketmasterId: updatedArtist.ticketmaster_id,
          imageUrl: updatedArtist.image_url,
          genres: updatedArtist.genres,
          isNew: false,
          wasUpdated: true,
        },
      })
    }

    // Create new artist
    const slug = generateSlug(name)

    // Ensure unique slug
    let finalSlug = slug
    let counter = 1
    while (true) {
      const { data: existingSlug } = await supabase
        .from("artists")
        .select("id")
        .eq("slug", finalSlug)
        .single()

      if (!existingSlug) break

      finalSlug = `${slug}-${counter}`
      counter++
    }

    const { data: newArtist, error: insertError } = await supabase
      .from("artists")
      .insert({
        name,
        slug: finalSlug,
        ticketmaster_id: ticketmasterId,
        image_url: imageUrl,
        genres: genres || [],
        popularity: 0,
        followers: 0,
        verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    // Trigger background sync for shows
    setImmediate(async () => {
      try {
        await fetch(
          `${process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3001"}/api/artists/sync-shows`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-cron-secret": process.env.CRON_SECRET || "",
            },
            body: JSON.stringify({
              artistId: newArtist.id,
            }),
          }
        )
      } catch (error) {
        console.error("Failed to trigger show sync:", error)
      }
    })

    return NextResponse.json({
      success: true,
      artist: {
        id: newArtist.id,
        name: newArtist.name,
        slug: newArtist.slug,
        ticketmasterId: newArtist.ticketmaster_id,
        imageUrl: newArtist.image_url,
        genres: newArtist.genres,
        isNew: true,
      },
    })
  } catch (error) {
    console.error("Artist import error:", error)
    return NextResponse.json(
      {
        error: "Failed to import artist",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
