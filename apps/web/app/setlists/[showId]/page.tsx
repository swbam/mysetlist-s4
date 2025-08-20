import { db } from "@repo/database";
import { artists, shows, venues } from "@repo/database/src/schema";
import { createMetadata } from "@repo/seo/metadata";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RealtimeActivityFeed } from "~/components/realtime-activity-feed";
import { EnhancedSetlistViewer } from "./components/enhanced-setlist-viewer";
import { ShowInfo } from "./components/show-info";

type SetlistPageProps = {
  params: Promise<{
    showId: string;
  }>;
};

export const generateMetadata = async ({
  params,
}: SetlistPageProps): Promise<Metadata> => {
  const { showId } = await params;

  // Fetch show details for metadata
  const show = await db
    .select({
      id: shows.id,
      name: shows.name,
      artist: artists.name,
      venue: venues.name,
    })
    .from(shows)
    .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(shows.id, showId))
    .limit(1);

  if (show.length === 0 || !show[0]) {
    return createMetadata({
      title: "Show Not Found - TheSet",
      description: "The requested show could not be found.",
    });
  }

  const firstShow = show[0];
  return createMetadata({
    title: `${firstShow.artist} at ${firstShow.venue} - TheSet`,
    description: `Live setlist and voting for ${firstShow.artist} at ${firstShow.venue}`,
  });
};

const SetlistPage = async ({ params }: SetlistPageProps) => {
  const { showId } = await params;

  // Fetch show data with setlists
  const show = await db
    .select({
      shows: {
        id: shows.id,
        name: shows.name,
        date: shows.date,
        status: shows.status,
        attendeeCount: shows.attendeeCount,
      },
      artists: {
        id: artists.id,
        name: artists.name,
        imageUrl: artists.imageUrl,
      },
      venues: {
        id: venues.id,
        name: venues.name,
        city: venues.city,
        country: venues.country,
        capacity: venues.capacity,
      },
    })
    .from(shows)
    .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(shows.id, showId))
    .limit(1);

  if (show.length === 0 || !show[0]) {
    notFound();
  }

  const showData = show[0];
  return (
    <div className="flex flex-col gap-8 py-8 md:py-16">
      <div className="container mx-auto">
        <ShowInfo
          showId={showId}
          show={{
            ...showData,
            shows: {
              ...showData.shows,
              name: showData.shows.name || "Untitled Show",
              date:
                showData.shows.date || new Date().toISOString().split("T")[0]!,
              status: showData.shows.status || "upcoming",
            },
          }}
        />

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EnhancedSetlistViewer
              showId={showId}
              artistId={showData.artists?.id}
              artistName={showData.artists?.name}
            />
          </div>

          <div className="lg:col-span-1">
            <RealtimeActivityFeed showId={showId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetlistPage;
