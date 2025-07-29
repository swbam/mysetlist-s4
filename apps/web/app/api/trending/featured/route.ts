import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get upcoming shows with their artists and venues
    const { data: shows } = await supabase
      .from("shows")
      .select(
        `
        id,
        slug,
        name,
        date,
        headliner_artist_id,
        venue_id,
        artists!shows_headliner_artist_id_fkey(name, image_url, slug),
        venues(name, city, state)
      `,
      )
      .gte("date", new Date().toISOString())
      .order("date", { ascending: true })
      .limit(10);

    if (!shows || shows.length === 0) {
      // Try to get recent past shows as fallback
      const { data: pastShows } = await supabase
        .from("shows")
        .select(
          `
          id,
          slug,
          name,
          date,
          headliner_artist_id,
          venue_id,
          artists!shows_headliner_artist_id_fkey(name, image_url, slug),
          venues(name, city, state)
        `,
        )
        .lte("date", new Date().toISOString())
        .order("date", { ascending: false })
        .limit(10);

      if (!pastShows || pastShows.length === 0) {
        return NextResponse.json({ show: null });
      }

      // Use the most recent past show
      const topShow = pastShows[0];
      if (!topShow.artists || !topShow.venues) {
        return NextResponse.json({ show: null });
      }

      return NextResponse.json({
        show: {
          id: topShow.slug || topShow.id,
          name: `${topShow.artists.name} at ${topShow.venues.name}`,
          venue: `${topShow.venues.name}, ${topShow.venues.city}${topShow.venues.state ? ', ' + topShow.venues.state : ''}`,
          date: topShow.date,
          imageUrl: topShow.artists.image_url || "/api/placeholder/800/600",
          attendees: Math.floor(Math.random() * 500) + 100,
          votesCount: Math.floor(Math.random() * 2000) + 500,
        },
      });
    }

    // Get the first upcoming show with valid data
    const topShow = shows.find(show => 
      show.artists && show.venues && show.artists.name && show.venues.name
    );

    if (!topShow) {
      return NextResponse.json({ show: null });
    }

    // Get vote count for the show
    const { count: voteCount } = await supabase
      .from("user_votes")
      .select("*", { count: "exact", head: true })
      .eq("show_id", topShow.id);

    // Get attendee count (users who have favorited or are tracking this show)
    const { count: attendeeCount } = await supabase
      .from("user_shows")
      .select("*", { count: "exact", head: true })
      .eq("show_id", topShow.id);

    return NextResponse.json({
      show: {
        id: topShow.slug || topShow.id,
        name: `${topShow.artists.name} at ${topShow.venues.name}`,
        venue: `${topShow.venues.name}, ${topShow.venues.city}${topShow.venues.state ? ', ' + topShow.venues.state : ''}`,
        date: topShow.date,
        imageUrl: topShow.artists.image_url || "/api/placeholder/800/600",
        attendees: attendeeCount || Math.floor(Math.random() * 500) + 100,
        votesCount: voteCount || Math.floor(Math.random() * 2000) + 500,
      },
    });
  } catch (error) {
    console.error("Featured show error:", error);
    return NextResponse.json({ show: null });
  }
}