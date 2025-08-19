import { createClient } from "~/lib/supabase/server";
import ContentClient from "./content-client";

// Force dynamic rendering due to user-specific data fetching
export const dynamic = "force-dynamic";

export default async function ContentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const supabase = await createClient();
  const { locale } = await params;

  // Fetch content data
  const [{ data: artists }, { data: venues }, { data: shows }] =
    await Promise.all([
      supabase
        .from("artists")
        .select("*, artist_stats(*)")
        .order("trending_score", { ascending: false })
        .limit(20),
      supabase
        .from("venues")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("shows")
        .select(
          `
        *,
        headliner:artists!shows_headliner_artist_id_fkey(name),
        venue:venues(name, city),
        _attendees:show_attendees(count),
        _setlists:setlists(count)
      `,
        )
        .order("trending_score", { ascending: false })
        .limit(20),
    ]);

  return (
    <ContentClient
      artists={artists || []}
      venues={venues || []}
      shows={shows || []}
      locale={locale}
    />
  );
}