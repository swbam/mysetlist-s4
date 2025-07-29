import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get upcoming shows in the next 30 days
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: upcomingShows } = await supabase
      .from("shows")
      .select(
        `
        id,
        slug,
        date,
        name,
        artists!shows_headliner_artist_id_fkey(name, slug),
        venues(name, city, state)
      `
      )
      .gte("date", today.toISOString())
      .lte("date", thirtyDaysFromNow.toISOString())
      .order("date", { ascending: true })
      .limit(3);

    if (!upcomingShows || upcomingShows.length === 0) {
      // Fallback: get any future shows
      const { data: futureShows } = await supabase
        .from("shows")
        .select(
          `
          id,
          slug,
          date,
          name,
          artists!shows_headliner_artist_id_fkey(name, slug),
          venues(name, city, state)
        `
        )
        .gte("date", today.toISOString())
        .order("date", { ascending: true })
        .limit(3);

      if (!futureShows || futureShows.length === 0) {
        return NextResponse.json({ shows: [] });
      }

      return NextResponse.json({
        shows: futureShows
          .filter(show => show.artists && show.venues)
          .map((show) => ({
            id: show.slug || show.id,
            artist: show.artists.name,
            venue: show.venues.name,
            date: show.date,
            ticketsLeft: undefined,
          })),
      });
    }

    // Transform the data
    const shows = upcomingShows
      .filter(show => show.artists && show.venues)
      .map((show) => ({
        id: show.slug || show.id,
        artist: show.artists.name,
        venue: show.venues.name,
        date: show.date,
        // Simulate tickets left for some shows
        ticketsLeft: Math.random() > 0.7 ? Math.floor(Math.random() * 50) + 10 : undefined,
      }));

    return NextResponse.json({ shows });
  } catch (error) {
    console.error("Upcoming shows error:", error);
    return NextResponse.json({ shows: [] });
  }
}