import { getUser } from "@repo/auth/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design-system";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import React, { Suspense } from "react";
import { BreadcrumbNavigation } from "~/components/breadcrumb-navigation";
import { ArtistErrorBoundary } from "~/components/error-boundaries/artist-error-boundary";
import { createArtistMetadata } from "~/lib/seo-metadata";
import {
  getArtist,
  getArtistShows,
  getArtistStats,
  importArtist,
} from "./actions";
import { ArtistHeader } from "./components/artist-header";
import { ArtistImportLoading } from "./components/artist-import-loading";
import { ArtistPageWrapper } from "./components/artist-page-wrapper";
import { ArtistStats } from "./components/artist-stats";
import { UpcomingShows } from "./components/upcoming-shows";

// Dynamic imports for the two main tabs only
const PastShows = dynamic(
  () =>
    import("./components/past-shows").then((mod) => ({
      default: mod.PastShows,
    })),
  {
    loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" />,
  },
);

type ArtistPageProps = {
  params: {
    slug: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
};

// Configure ISR with revalidation
export const revalidate = 3600; // Revalidate every hour
export const dynamicParams = true; // Allow dynamic params beyond generateStaticParams

export const generateMetadata = async ({
  params,
}: ArtistPageProps): Promise<Metadata> => {
  try {
    const { slug } = params;
    const tmAttractionId = undefined as unknown as string; // no longer read from URL

    if (!slug) {
      return createArtistMetadata({
        name: "Artist Not Found",
        slug: "not-found",
      });
    }

    const artist = await getArtist(slug);

    // For metadata generation, if artist not found but we have ticketmaster ID,
    // create temporary metadata while import happens in the background
    if (!artist && tmAttractionId) {
      const artistName = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      return createArtistMetadata({
        name: artistName,
        slug: slug,
      });
    }

    if (!artist) {
      return createArtistMetadata({
        name: "Artist Not Found",
        slug: "not-found",
      });
    }

    return createArtistMetadata({
      name: artist.name,
      ...(artist.imageUrl && { imageUrl: artist.imageUrl }),
      slug: artist.slug,
      ...(artist.followers && { followerCount: artist.followers }),
      ...(artist.followerCount && { followerCount: artist.followerCount }),
    });
  } catch (error) {
    console.error("Error generating metadata for artist page:", error);
    return createArtistMetadata({
      name: "Artist Error",
      slug: "error",
    });
  }
};

const ArtistPage = async ({ params, searchParams }: ArtistPageProps) => {
  try {
    const { slug } = params;
    const tmAttractionId = searchParams?.tmAttractionId as string;

    // Validate slug parameter
    if (!slug || typeof slug !== "string") {
      console.error("Invalid slug parameter:", slug);
      notFound();
    }

    const _user = await getUser();
    void _user; // Intentionally unused - keeps session active

    // Fetch artist data with error handling
    const artist = await getArtist(slug);

    // If artist not found, show not found page
    if (!artist) {
      if (tmAttractionId) {
        await importArtist(tmAttractionId);
      }
      notFound();
    }

    // Fetch only the data needed for upcoming and past shows with additional error handling
    const results = await Promise.allSettled([
      getArtistShows(artist.id, "upcoming"),
      getArtistShows(artist.id, "past"),
      getArtistStats(artist.id),
    ]);

    // Handle results with better error logging
    const upcomingShows =
      results[0].status === "fulfilled" ? results[0].value : [];
    const pastShows = results[1].status === "fulfilled" ? results[1].value : [];
    const _stats = results[2].status === "fulfilled" ? results[2].value : null;

    if (results[0].status === "rejected") {
      console.error("Error fetching upcoming shows:", results[0].reason);
    }
    if (results[1].status === "rejected") {
      console.error("Error fetching past shows:", results[1].reason);
    }
    if (results[2].status === "rejected") {
      console.error("Error fetching artist stats:", results[2].reason);
    }

    void _stats; // Future implementation: artist statistics display

    const breadcrumbItems = [
      { label: "Artists", href: "/artists" },
      { label: artist.name, isCurrentPage: true },
    ];

    // Transform artist data for components
    const artistData = {
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      imageUrl: artist.imageUrl || undefined,
      smallImageUrl: artist.smallImageUrl || undefined,
      genres: artist.genres || "[]",
      popularity: artist.popularity || 0,
      followers: artist.followers || 0,
      verified: artist.verified || false,
      externalUrls: artist.externalUrls || undefined,
      spotifyId: artist.spotifyId || undefined,
    };

    // Transform shows data to match component interfaces
    const transformedUpcomingShows = upcomingShows.map(
      ({ show, venue, orderIndex, isHeadliner }) => ({
        show: {
          id: show.id,
          name: show.name || "Untitled Show",
          slug: show.slug || "",
          date: show.date || "",
          ticketUrl: show.ticketUrl,
          status:
            (show.status as
              | "upcoming"
              | "ongoing"
              | "completed"
              | "cancelled") || "upcoming",
        },
        venue: venue
          ? {
              id: venue.id,
              name: venue.name,
              city: venue.city,
              ...(venue.state && { state: venue.state }),
              country: venue.country,
            }
          : undefined,
        orderIndex: orderIndex || 0,
        isHeadliner: isHeadliner || false,
      }),
    );

    const transformedPastShows = pastShows.map(
      ({ show, venue, orderIndex, isHeadliner }) => ({
        show: {
          id: show.id,
          name: show.name || "Untitled Show",
          slug: show.slug || "",
          date: show.date || "",
          venueId: show.venueId,
          setlistCount: show.setlistCount,
          attendeeCount: null, // Not tracked yet
          voteCount: show.voteCount,
          ticketUrl: show.ticketUrl,
          status:
            (show.status as
              | "upcoming"
              | "ongoing"
              | "completed"
              | "cancelled") || "completed",
        },
        venue: venue
          ? {
              id: venue.id,
              name: venue.name,
              city: venue.city,
              ...(venue.state && { state: venue.state }),
              country: venue.country,
            }
          : undefined,
        orderIndex: orderIndex || 0,
        isHeadliner: isHeadliner || false,
      }),
    );

    return (
      <ArtistErrorBoundary artistName={artist.name || "Unknown Artist"}>
        <ArtistPageWrapper
          artistId={artist.id}
          artistName={artist.name || "Unknown Artist"}
          spotifyId={artist.spotifyId || undefined}
          initialData={{
            artist: artistData,
            shows: [...transformedUpcomingShows, ...transformedPastShows],
            stats: _stats,
          }}
        >
          <div className="container mx-auto py-8">
            {/* Breadcrumb Navigation */}
            <BreadcrumbNavigation items={breadcrumbItems} className="mb-6" />

            {/* Artist Header */}
            <ArtistHeader artist={artistData} />

            {/* Artist Stats */}
            <div className="mt-8">
              <ArtistStats artistId={artist.id} />
            </div>

            {/* Content Tabs - Simplified to only show upcoming and past shows */}
            <Tabs defaultValue="shows" className="mt-8 w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="shows" aria-label="View upcoming shows">
                  Upcoming Shows
                </TabsTrigger>
                <TabsTrigger value="past" aria-label="View past shows">
                  Past Shows
                </TabsTrigger>
              </TabsList>

              <TabsContent value="shows" className="space-y-4">
                <React.Suspense
                  fallback={
                    <div className="h-64 animate-pulse rounded-lg bg-muted" />
                  }
                >
                  <UpcomingShows
                    shows={transformedUpcomingShows}
                    artistName={artist.name || "Unknown Artist"}
                    artistId={artist.id}
                    spotifyId={artist.spotifyId || undefined}
                  />
                </React.Suspense>
              </TabsContent>

              <TabsContent value="past" className="space-y-4">
                <React.Suspense
                  fallback={
                    <div className="h-64 animate-pulse rounded-lg bg-muted" />
                  }
                >
                  <PastShows
                    shows={transformedPastShows}
                    artistName={artist.name || "Unknown Artist"}
                    artistId={artist.id}
                  />
                </React.Suspense>
              </TabsContent>
            </Tabs>
          </div>
        </ArtistPageWrapper>
      </ArtistErrorBoundary>
    );
  } catch (error) {
    console.error("Critical error in ArtistPage:", error);
    // Return a minimal error page instead of letting it crash
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Unable to Load Artist
          </h1>
          <p className="text-gray-600 mb-4">
            We encountered an error while loading this artist page.
          </p>
          <p className="text-sm text-gray-500">
            Please try refreshing the page or contact support if the problem
            persists.
          </p>
        </div>
      </div>
    );
  }
};

// Generate static params for popular artists
export async function generateStaticParams() {
  try {
    const { db, artists } = await import("@repo/database");
    const { desc, sql } = await import("drizzle-orm");

    // Get top 50 most popular artists for static generation
    const popularArtists = await db
      .select({
        slug: artists.slug,
      })
      .from(artists)
      .where(sql`${artists.popularity} > 0 OR ${artists.trendingScore} > 0`)
      .orderBy(desc(artists.trendingScore), desc(artists.popularity))
      .limit(50);

    return popularArtists.map((artist) => ({
      slug: artist.slug,
    }));
  } catch (_error) {
    return [];
  }
}

export default ArtistPage;
