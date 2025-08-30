import { getUser } from "@repo/auth/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design-system";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import React from "react";
import { BreadcrumbNavigation } from "~/components/breadcrumb-navigation";
import { ArtistErrorBoundary } from "~/components/error-boundaries/artist-error-boundary";
import { createArtistMetadata } from "~/lib/seo-metadata";
import { getArtist, getArtistShows, getArtistStats, importArtist } from "./actions";
import { ArtistHeader } from "./components/artist-header";
// ArtistImportLoading import removed - not used
import { ArtistPageWrapper } from "./components/artist-page-wrapper";
import { ArtistStats } from "./components/artist-stats";
import { UpcomingShows } from "./components/upcoming-shows";
import { ImportProgress } from "~/components/import/ImportProgress";

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

// Configure ISR with revalidation
export const revalidate = 3600; // Revalidate every hour
export const dynamicParams = true; // Allow dynamic params beyond generateStaticParams

export const generateMetadata = async ({ params }: any): Promise<Metadata> => {
  try {
  const { slug } = await params;
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
        .replace(/\b\w/g, (l: string) => l.toUpperCase());
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

const ArtistPage = async ({ params, searchParams }: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tmAttractionId?: string }>;
}) => {
  try {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;
  const tmAttractionId = searchParamsResolved?.tmAttractionId as string;

    // Validate slug parameter
    if (!slug || typeof slug !== "string") {
      console.error("Invalid slug parameter:", slug);
      notFound();
    }

    const _user = await getUser();
    void _user; // Intentionally unused - keeps session active

    // Fetch artist data with error handling
    const artist = await getArtist(slug);

    // If artist not found but has tmAttractionId, show import progress
    if (!artist && tmAttractionId) {
      const importResult = await importArtist(tmAttractionId);
      
      return (
        <div className="container mx-auto py-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Importing Artist</h1>
              <p className="text-muted-foreground mt-2">
                We're importing this artist from Ticketmaster. This usually takes 1-2 minutes.
              </p>
            </div>
            
            <ImportProgress
              artistId={importResult.artistId}
              onComplete={() => {
                // Redirect to artist page after completion
                window.location.href = `/artists/${importResult.slug}`;
              }}
              onError={(error) => {
                console.error('Import failed:', error);
              }}
              showTitle={true}
              showEstimatedTime={true}
              autoRetry={true}
            />
          </div>
        </div>
      );
    }

    // If artist not found and no tmAttractionId, show not found page
    if (!artist) {
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
      ...(artist.imageUrl && { imageUrl: artist.imageUrl }),
      ...(artist.smallImageUrl && { smallImageUrl: artist.smallImageUrl }),
      genres: artist.genres || "[]",
      popularity: artist.popularity || 0,
      followers: artist.followers || 0,
      verified: artist.verified || false,
      ...(artist.externalUrls && { externalUrls: artist.externalUrls }),
      ...(artist.spotifyId && { spotifyId: artist.spotifyId }),
    };

    // Transform shows data to match component interfaces
    const transformedUpcomingShows = upcomingShows.map(
      ({ show, venue }) => ({
        show: {
          id: String(show.id),
          name: String(show.name || "Untitled Show"),
          slug: "", // Not available in raw SQL query
          date: String(show.date || ""),
          status: (show.status as "upcoming" | "ongoing" | "completed" | "cancelled") || "upcoming",
        },
        venue: venue
          ? {
              id: String(venue.id),
              name: String(venue.name),
              city: String(venue.city),
              ...(venue.state ? { state: String(venue.state) } : {}),
              country: String(venue.country),
            }
          : {
              id: "",
              name: "Unknown Venue",
              city: "",
              country: "",
            },
        orderIndex: 0, // Not available in raw SQL query
        isHeadliner: false, // Not available in raw SQL query
      }),
    );

    const transformedPastShows = pastShows.map(
      ({ show, venue }) => ({
        show: {
          id: String(show.id),
          name: String(show.name || "Untitled Show"),
          slug: "", // Not available in raw SQL query
          date: String(show.date || ""),
          venueId: null, // Not available in raw SQL query
          setlistCount: 0, // Not available in raw SQL query
          attendeeCount: null, // Not tracked yet
          voteCount: 0, // Not available in raw SQL query
          status: (show.status as "upcoming" | "ongoing" | "completed" | "cancelled") || "completed",
        },
        venue: venue
          ? {
              id: String(venue.id),
              name: String(venue.name),
              city: String(venue.city),
              ...(venue.state ? { state: String(venue.state) } : {}),
              country: String(venue.country),
            }
          : {
              id: "",
              name: "Unknown Venue",
              city: "",
              country: "",
            },
        orderIndex: 0, // Not available in raw SQL query
        isHeadliner: false, // Not available in raw SQL query
      }),
    );

    return (
      <ArtistErrorBoundary artistName={artist.name || "Unknown Artist"}>
          <ArtistPageWrapper
            artistId={artist.id}
            artistName={artist.name || "Unknown Artist"}
            {...(artist.spotifyId && { spotifyId: artist.spotifyId })}
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
                      {...(artist.spotifyId && { spotifyId: artist.spotifyId })}
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
    const { createConvexClient } = await import("~/lib/database");
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
