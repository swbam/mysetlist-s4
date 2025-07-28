import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "~/lib/supabase/server"

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServiceClient()

    // Get the most voted show from the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // First, get show with most votes
    const { data: topShow } = await supabase
      .from("shows")
      .select(`
        id,
        name,
        date,
        image_url,
        venue:venues(name, city, state),
        artist:artists!shows_headliner_artist_id_fkey(name),
        vote_count:user_votes(count),
        attendance_count
      `)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("vote_count", { ascending: false })
      .limit(1)
      .single()

    if (!topShow) {
      // Fallback: get any upcoming show
      const { data: anyShow } = await supabase
        .from("shows")
        .select(`
          id,
          name,
          date,
          image_url,
          venue:venues(name, city, state),
          artist:artists!shows_headliner_artist_id_fkey(name)
        `)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(1)
        .single()

      if (!anyShow) {
        return NextResponse.json({ show: null })
      }

      return NextResponse.json({
        show: {
          id: anyShow.id,
          name: `${anyShow.artist?.[0]?.name || "Artist"} at ${anyShow.venue?.[0]?.name || "Venue"}`,
          venue: `${anyShow.venue?.[0]?.name || "Venue"}, ${anyShow.venue?.[0]?.city || "City"}`,
          date: anyShow.date,
          imageUrl: anyShow.image_url || "/api/placeholder/800/600",
          attendees: 0,
          votesCount: 0,
        },
      })
    }

    // Get actual vote count
    const { count: voteCount } = await supabase
      .from("user_votes")
      .select("*", { count: "exact", head: true })
      .eq("show_id", topShow.id)

    return NextResponse.json({
      show: {
        id: topShow.id,
        name: `${topShow.artist?.[0]?.name || "Artist"} at ${topShow.venue?.[0]?.name || "Venue"}`,
        venue: `${topShow.venue?.[0]?.name || "Venue"}, ${topShow.venue?.[0]?.city || "City"}`,
        date: topShow.date,
        imageUrl: topShow.image_url || "/api/placeholder/800/600",
        attendees: topShow.attendance_count || 0,
        votesCount: voteCount || 0,
      },
    })
  } catch (_error) {
    return NextResponse.json({ show: null })
  }
}
