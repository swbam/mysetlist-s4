import {
  and,
  artists,
  db,
  desc,
  eq,
  ilike,
  isNotNull,
  setlists,
  shows,
  venues,
} from "~/lib/database";
import { Badge } from "@repo/design-system";
import { Button } from "@repo/design-system";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system";
import { Input } from "@repo/design-system";
import { Skeleton } from "@repo/design-system";
import { createMetadata } from "@repo/seo/metadata";
import { Calendar, MapPin, Music, Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

export const generateMetadata = (): Metadata => {
  return createMetadata({
    title: "Setlists - TheSet",
    description:
      "Browse concert setlists, vote on songs, and discover what artists are playing live.",
  });
};

interface SetlistWithDetails {
  id: string;
  name: string;
  songCount: number;
  voteCount: number;
  isLocked: boolean;
  createdAt: Date;
  show: {
    id: string;
    name: string;
    date: Date | null;
    slug: string;
    artist: {
      name: string;
      slug: string;
      imageUrl: string | null;
    } | null;
    venue: {
      name: string;
      city: string | null;
      state: string | null;
      slug: string;
    } | null;
  };
}

async function getSetlists(search?: string): Promise<SetlistWithDetails[]> {
  try {
    const query = db
      .select({
        // Setlist fields
        id: setlists.id,
        name: setlists.name,
        totalVotes: setlists.totalVotes,
        isLocked: setlists.isLocked,
        createdAt: setlists.createdAt,
        // Show fields
        showId: shows.id,
        showName: shows.name,
        showDate: shows.date,
        showSlug: shows.slug,
        // Artist fields
        artistName: artists.name,
        artistSlug: artists.slug,
        artistImageUrl: artists.imageUrl,
        // Venue fields
        venueName: venues.name,
        venueCity: venues.city,
        venueState: venues.state,
        venueSlug: venues.slug,
      })
      .from(setlists)
      .leftJoin(shows, eq(setlists.showId, shows.id))
      .leftJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(
        and(
          isNotNull(shows.id),
          search ? ilike(setlists.name, `%${search}%`) : undefined,
        ),
      )
      .orderBy(desc(setlists.createdAt))
      .limit(50);

    const result = await query;

    return result.map((row) => ({
      id: row.id,
      name: row.name || "Main Set",
      songCount: row.totalVotes || 0,
      voteCount: row.totalVotes || 0,
      isLocked: row.isLocked || false,
      createdAt: row.createdAt,
      show: {
        id: row.showId || "",
        name: row.showName || "Unknown Show",
        date: row.showDate ? new Date(row.showDate) : null,
        slug: row.showSlug || "",
        artist: row.artistName
          ? {
              name: row.artistName,
              slug: row.artistSlug || "",
              imageUrl: row.artistImageUrl,
            }
          : null,
        venue: row.venueName
          ? {
              name: row.venueName,
              city: row.venueCity,
              state: row.venueState,
              slug: row.venueSlug || "",
            }
          : null,
      },
    }));
  } catch (error) {
    console.error("Error fetching setlists:", error);
    return [];
  }
}

function SetlistCard({ setlist }: { setlist: SetlistWithDetails }) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <Link href={`/setlists/${setlist.show.id}`}>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded bg-muted flex-shrink-0">
              {setlist.show.artist?.imageUrl ? (
                <Image
                  src={setlist.show.artist.imageUrl}
                  alt={setlist.show.artist.name || "Artist"}
                  fill
                  className="object-cover transition-transform group-hover:scale-110"
                  sizes="48px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Music className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
                {setlist.name}
              </CardTitle>
              <div className="mt-1 space-y-1">
                {setlist.show.artist && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    by {setlist.show.artist.name}
                  </p>
                )}
                {setlist.show.venue && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="line-clamp-1">
                      {setlist.show.venue.name}
                      {setlist.show.venue.city &&
                        `, ${setlist.show.venue.city}`}
                      {setlist.show.venue.state &&
                        `, ${setlist.show.venue.state}`}
                    </span>
                  </div>
                )}
                {setlist.show.date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(setlist.show.date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Music className="h-4 w-4" />
                <span>{setlist.songCount} songs</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{setlist.voteCount} votes</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {setlist.isLocked && (
                <Badge variant="secondary" className="text-xs">
                  Locked
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                Setlist
              </Badge>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

function SetlistsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function SetlistsContent({ search }: { search?: string }) {
  const setlists = await getSetlists(search);

  if (setlists.length === 0) {
    return (
      <div className="py-12 text-center">
        <Music className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">No setlists found</h3>
        <p className="text-muted-foreground">
          {search
            ? "Try adjusting your search terms"
            : "No setlists have been created yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {setlists.map((setlist) => (
        <SetlistCard key={setlist.id} setlist={setlist} />
      ))}
    </div>
  );
}

export default async function SetlistsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Concert Setlists
          </h1>
          <p className="text-muted-foreground text-lg">
            Browse setlists from concerts around the world. Vote for songs and
            help create the ultimate setlists.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search setlists..." className="pl-10" />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">
                <Suspense fallback="--">
                  {/* You could add a stats component here */}
                  50+
                </Suspense>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Active Setlists</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">
                <Suspense fallback="--">1.2K+</Suspense>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Total Votes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">
                <Suspense fallback="--">300+</Suspense>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Songs Added</p>
            </CardContent>
          </Card>
        </div>

        {/* Setlists Grid */}
        <Suspense fallback={<SetlistsSkeleton />}>
          <SetlistsContent search={search} />
        </Suspense>

        {/* Call to Action */}
        <div className="text-center pt-8">
          <p className="text-muted-foreground mb-4">
            Can't find a setlist for a show you attended?
          </p>
          <Button asChild>
            <Link href="/shows">Find Your Show</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
