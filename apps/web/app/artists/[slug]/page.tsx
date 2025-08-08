import { getUser } from "@repo/auth/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design-system";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import React from "react";
import { BreadcrumbNavigation } from "~/components/breadcrumb-navigation";
import { ArtistErrorBoundary } from "~/components/error-boundaries/artist-error-boundary";
import { createArtistMetadata } from "~/lib/seo-metadata";
import {
  getArtist,
  getArtistShows,
  getArtistStats,
  getArtistSetlists,
  getSimilarArtists,
} from "./actions";
import { ArtistHeader } from "./components/artist-header";
import { ArtistPageWrapper } from "./components/artist-page-wrapper";
import { ArtistStats } from "./components/artist-stats";
import { UpcomingShows } from "./components/upcoming-shows";

// Dynamic imports for tab content to optimize initial bundle
const ArtistBio = dynamic(
  () =>
    import("./components/artist-bio").then((mod) => ({
      default: mod.ArtistBio,
    })),
  {
    loading: () => <div className="h-32 animate-pulse rounded-lg bg-muted" />,
  },
);

const ArtistSongCatalog = dynamic(
  () =>
    import("./components/artist-song-catalog").then((mod) => ({
      default: mod.ArtistSongCatalog as any,
    })),
  {
    loading: () => <div className="h-96 animate-pulse rounded-lg bg-muted" />,
  },
);

const ArtistTopTracks = dynamic(
  () =>
    import("./components/artist-top-tracks").then((mod) => ({
      default: mod.ArtistTopTracks,
    })),
  {
    loading: () => <div className="h-96 animate-pulse rounded-lg bg-muted" />,
  },
);

const PastShows = dynamic(
  () =>
    import("./components/past-shows").then((mod) => ({
      default: mod.PastShows as any,
    })),
  {
    loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" />,
  },
);

const SimilarArtists = dynamic(
  () =>
    import("./components/similar-artists").then((mod) => ({
      default: mod.SimilarArtists,
    })),
  {
    loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" />,
  },
);

const ArtistSetlistsView = dynamic(
  () =>
    import("./components/artist-setlists-view").then((mod) => ({
      default: mod.ArtistSetlistsView,
    })),
  {
    loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" />,
  },
);

type ArtistPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

// Configure ISR with revalidation
export const revalidate = 3600; // Revalidate every hour
export const dynamicParams = true; // Allow dynamic params beyond generateStaticParams

export const generateMetadata = async ({
  params,
}: ArtistPageProps): Promise<Metadata> => {
  const { slug } = await params;

  const artist = await getArtist(slug);

  if (!artist) {
    return createArtistMetadata({
      name: "Artist Not Found",
      bio: "The requested artist could not be found.",
      slug: "not-found",
    });
  }

  return createArtistMetadata({
    name: artist.name,
    ...(artist.bio && { bio: artist.bio }),
    ...(artist.imageUrl && { imageUrl: artist.imageUrl }),
    slug: artist.slug,
    ...(artist.followers && { followerCount: artist.followers }),
    ...(artist.followerCount && { followerCount: artist.followerCount }),
  });
};

const ArtistPage = async ({ params }: ArtistPageProps) => {
  const { slug } = await params;
  const _user = await getUser();
  void _user; // Intentionally unused - keeps session active

  // Fetch artist data
  const artist = await getArtist(slug);

  if (!artist) {
    notFound();
  }

  // Fetch all related data in parallel with enhanced error handling
  const results = await Promise.allSettled([
    getArtistShows(artist.id, "upcoming"),
    getArtistShows(artist.id, "past"),
    getArtistStats(artist.id),
    getSimilarArtists(artist.id, artist.genres),
    getArtistSetlists(artist.id, 5), // Get recent setlists
  ]);

  const upcomingShows =
    results[0].status === "fulfilled" ? results[0].value : [];
  const pastShows = results[1].status === "fulfilled" ? results[1].value : [];
  const _stats = results[2].status === "fulfilled" ? results[2].value : null;
  const _similarArtists =
    results[3].status === "fulfilled" ? results[3].value : [];
  const artistSetlists =
    results[4].status === "fulfilled" ? results[4].value : [];

  void _stats; // Future implementation: artist statistics display
  void _similarArtists; // Future implementation: similar artists section

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
    bio: artist.bio || undefined,
    externalUrls: artist.externalUrls || undefined,
    spotifyId: artist.spotifyId || undefined,
  };

  // Transform shows data
  const transformedUpcomingShows = upcomingShows.map(
    ({ show, venue, orderIndex, isHeadliner }) => ({
      show: {
        ...show,
        ...(show.ticketUrl && { ticketUrl: show.ticketUrl }),
        status: show.status || "confirmed",
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
        ...show,
        ...(show.ticketUrl && { ticketUrl: show.ticketUrl }),
        status: show.status || "completed",
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
    <ArtistErrorBoundary artistName={artist.name}>
      <ArtistPageWrapper
        artistId={artist.id}
        artistName={artist.name}
        spotifyId={artist.spotifyId}
      >
        <div className="container mx-auto py-8">
          {/* Breadcrumb Navigation */}
          {/* @ts-ignore React 19 type compatibility */}
          <BreadcrumbNavigation items={breadcrumbItems} className="mb-6" />

          {/* Artist Header */}
          {/* @ts-ignore React 19 type compatibility */}
          <ArtistHeader artist={artistData} />

          {/* Artist Stats */}
          <div className="mt-8">
            <ArtistStats artistId={artist.id} />
          </div>

          {/* Content Tabs (only Upcoming and Past as requested) */}
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
                {React.createElement(UpcomingShows as any, {
                  shows: transformedUpcomingShows,
                  artistName: artist.name,
                  artistId: artist.id,
                  spotifyId: artist.spotifyId,
                })}
              </React.Suspense>
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              <React.Suspense
                fallback={
                  <div className="h-64 animate-pulse rounded-lg bg-muted" />
                }
              >
                {React.createElement(PastShows as any, {
                  shows: transformedPastShows,
                  artistName: artist.name,
                  artistId: artist.id,
                })}
              </React.Suspense>
            </TabsContent>

            {/* Removed Setlists, Music, About tabs per requirement */}
          </Tabs>
        </div>
      </ArtistPageWrapper>
    </ArtistErrorBoundary>
  );
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
