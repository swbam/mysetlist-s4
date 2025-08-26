"use client";

import { Card } from "@repo/design-system/card";
import { Music } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  EmptyState,
  ResponsiveGrid,
} from "~/components/layout/responsive-grid";
import { type ShowWithDetails, fetchShows } from "../actions";
import { ShowCard } from "./show-card";

export const ShowsGrid = () => {
  const [shows, setShows] = useState<ShowWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadShows = async () => {
      setLoading(true);
      try {
        const city = searchParams.get("city") || undefined;
        const dateFrom = searchParams.get("dateFrom") || undefined;
        const dateTo = searchParams.get("dateTo") || undefined;
        const orderBy =
          (searchParams.get("orderBy") as "date" | "trending" | "popularity") ||
          "date";

        const { shows: fetchedShows } = await fetchShows({
          status: "upcoming",
          ...(city && { city }),
          ...(dateFrom && { dateFrom }),
          ...(dateTo && { dateTo }),
          orderBy,
          limit: 20,
        });

        setShows(fetchedShows);
      } catch (_error) {
        // Silent error handling
      } finally {
        setLoading(false);
      }
    };

    loadShows();
  }, [searchParams]);

  const emptyState = (
    <EmptyState
      icon={<Music className="h-8 w-8 text-muted-foreground" />}
      title="No Shows Found"
      description="Try adjusting your filters or check back later for new shows."
    />
  );

  return (
    <ResponsiveGrid
      variant="shows"
      loading={loading}
      loadingCount={8}
      emptyState={emptyState}
    >
      {shows.map((show) => (
        <div key={show.id} role="gridcell">
          <ShowCard show={show} />
        </div>
      ))}
    </ResponsiveGrid>
  );
};
