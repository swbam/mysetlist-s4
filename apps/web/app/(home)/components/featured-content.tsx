import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@repo/design-system/components/ui/card";
import {
  Calendar,
  ChevronRight,
  Heart,
  MapPin,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createServiceClient } from "~/lib/supabase/server";
import { parseGenres } from "~/lib/utils";

// Server component to fetch real data from Supabase
async function getFeaturedData() {
  const supabase = createServiceClient();

  // Get featured artists (trending artists with upcoming shows)
  const { data: featuredArtists } = await supabase
    .from("artists")
    .select("*")
    .gt("upcoming_shows", 0)
    .or("trending_score.gt.0,popularity.gt.50")
    .order("trending_score", { ascending: false })
    .order("popularity", { ascending: false })
    .limit(3);

  // Get featured shows (trending shows with high vote counts)
  const { data: rawShows } = await supabase
    .from("shows")
    .select(`
      id,
      name,
      slug,
      date,
      status,
      vote_count,
      attendee_count,
      view_count,
      trending_score,
      headliner_artist_id,
      venue_id
    `)
    .gte("date", new Date().toISOString().split("T")[0])
    .gt("vote_count", 0)
    .order("trending_score", { ascending: false })
    .order("vote_count", { ascending: false })
    .limit(2);

  // Get artist and venue details for shows
  let featuredShows: any[] = [];
  if (rawShows && rawShows.length > 0) {
    const artistIds = [
      ...new Set(rawShows.map((s) => s.headliner_artist_id).filter(Boolean)),
    ];
    const venueIds = [
      ...new Set(rawShows.map((s) => s.venue_id).filter(Boolean)),
    ];

    const [artistsResponse, venuesResponse] = await Promise.all([
      artistIds.length > 0
        ? supabase
            .from("artists")
            .select("id, name, slug, image_url")
            .in("id", artistIds)
        : Promise.resolve({ data: [] }),
      venueIds.length > 0
        ? supabase
            .from("venues")
            .select("id, name, city, state")
            .in("id", venueIds)
        : Promise.resolve({ data: [] }),
    ]);

    const artistsMap = new Map(
      (artistsResponse.data || []).map((a) => [a.id, a]),
    );
    const venuesMap = new Map(
      (venuesResponse.data || []).map((v) => [v.id, v]),
    );

    featuredShows = rawShows.map((show) => {
      const artist = show.headliner_artist_id
        ? artistsMap.get(show.headliner_artist_id)
        : null;
      const venue = show.venue_id ? venuesMap.get(show.venue_id) : null;

      return {
        id: show.id,
        slug: show.slug,
        artist: artist?.name || "Unknown Artist",
        artistSlug: artist?.slug,
        venue: venue?.name || "Unknown Venue",
        city: venue
          ? `${venue.city}${venue.state ? `, ${venue.state}` : ""}`
          : "Unknown Location",
        date: show.date,
        image:
          artist?.image_url ||
          "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=600&h=400&fit=crop",
        votesCount: show.vote_count || 0,
      };
    });
  }

  return {
    featuredArtists: (featuredArtists || []).map((artist) => ({
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      image:
        artist.image_url ||
        artist.small_image_url ||
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
      genre: parseGenres(artist.genres)?.[0] || "Music",
      upcomingShows: artist.upcoming_shows || 0,
      trending: (artist.trending_score || 0) > 0,
    })),
    featuredShows,
  };
}

async function FeaturedContent() {
  const { featuredArtists, featuredShows } = await getFeaturedData();
  return (
    <section className="py-16">
      <div className="space-y-16">
        {/* Featured Artists */}
        <div>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Featured Artists
              </h2>
              <p className="text-muted-foreground mt-2">
                Top artists with upcoming shows
              </p>
            </div>
            <Link href="/artists">
              <Button variant="ghost" className="gap-2">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredArtists.map((artist) => (
              <Card
                key={artist.id}
                className="group overflow-hidden transition-all hover:shadow-lg"
              >
                <CardHeader className="p-0">
                  <div className="relative aspect-square overflow-hidden">
                    <Image
                      src={artist.image}
                      alt={artist.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    {artist.trending && (
                      <Badge className="absolute top-4 right-4 gap-1">
                        <Sparkles className="h-3 w-3" />
                        Trending
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-xl">{artist.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {artist.genre}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm">
                      {artist.upcomingShows} upcoming shows
                    </span>
                    <Link href={`/artists/${artist.slug}`}>
                      <Button size="sm" variant="secondary">
                        View Artist
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Featured Shows */}
        <div>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Hot Shows This Week
              </h2>
              <p className="text-muted-foreground mt-2">
                Most voted upcoming performances
              </p>
            </div>
            <Link href="/shows">
              <Button variant="ghost" className="gap-2">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {featuredShows.map((show) => (
              <Card
                key={show.id}
                className="group overflow-hidden transition-all hover:shadow-lg"
              >
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={show.image}
                    alt={`${show.artist} at ${show.venue}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="font-bold text-2xl">{show.artist}</h3>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {show.venue}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(show.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {show.votesCount.toLocaleString()} votes
                      </span>
                    </div>
                    <Link href={`/shows/${show.slug}`}>
                      <Button size="sm">Vote on Setlist</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-8 text-center">
            <Trophy className="mx-auto h-12 w-12 text-primary mb-4" />
            <h3 className="font-bold text-2xl mb-2">
              Join the MySetlist Community
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Be part of the revolution in concert experiences. Vote on
              setlists, discover new artists, and help shape the future of live
              music.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Get Started Free
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="outline">
                  Learn More
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default FeaturedContent;
