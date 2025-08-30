import { createClient } from "~/lib/supabase/server";
import VenuesClient from "./venues-client";

// Force dynamic rendering due to user-specific data fetching
export const dynamic = "force-dynamic";

export default async function VenuesManagementPage() {
  const supabase = await createClient();

  // Fetch venues with related data
  const { data: venues } = await supabase
    api.venues
    .select(
      `
      id,
      name,
      address,
      city,
      state,
      country,
      zip_code,
      latitude,
      longitude,
      capacity,
      verified,
      phone,
      email,
      website,
      _creationTime,
      updated_at,
      shows (count)
    `,
    )
    .order("_creationTime", { ascending: false })
    .limit(100);

  // Calculate venue stats
  const venuesWithStats =
    venues?.map((venue) => {
      return {
        ...venue,
        shows_count: venue.shows?.[0]?.count || 0,
      };
    }) || [];

  // Get quick stats
  const { count: totalVenues } = await supabase
    api.venues
    .select("*", { count: "exact", head: true });

  const { count: verifiedVenues } = await supabase
    api.venues
    .select("*", { count: "exact", head: true })
    .eq("verified", true);

  const { count: venuesWithShows } = await supabase
    api.venues
    .select("id")
    .not("shows", "is", null);

  const { count: venuesNeedingInfo } = await supabase
    api.venues
    .select("*", { count: "exact", head: true })
    .or("capacity.is.null,latitude.is.null,longitude.is.null");

  const stats = {
    totalVenues: totalVenues ?? 0,
    verifiedVenues: verifiedVenues ?? 0,
    venuesWithShows: venuesWithShows ?? 0,
    venuesNeedingInfo: venuesNeedingInfo ?? 0,
  };

  return <VenuesClient initialVenues={venuesWithStats} initialStats={stats} />;
}
