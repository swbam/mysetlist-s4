import { createConvexClient } from "~/lib/database";
import { api } from "~/lib/convex-api";
import ContentClient from "./content-client";

// Force dynamic rendering due to user-specific data fetching
export const dynamic = "force-dynamic";

export default async function ContentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const convex = createConvexClient();
  const { locale } = await params;

  // Fetch content data
  const [artists, venues, shows] = await Promise.all([
    convex.query(api.artists.getAll, { limit: 20 }),
    convex.query(api.venues.getAll, { limit: 20 }),
    convex.query(api.shows.getUpcoming, { limit: 20 }),
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