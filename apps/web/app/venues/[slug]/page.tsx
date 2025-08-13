import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  ExternalLink,
  MapPin,
  Music,
  Ticket,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbNavigation } from "~/components/breadcrumb-navigation";
import { createVenueMetadata } from "~/lib/seo-metadata";
import { getNearbyVenues, getVenueBySlug, getVenueShows } from "./actions";

type VenuePageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export const generateMetadata = async ({
  params,
}: VenuePageProps): Promise<Metadata> => {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);

  if (!venue) {
    return createVenueMetadata({
      name: "Venue Not Found",
      city: "Unknown",
      slug: "not-found",
      description: "The venue you are looking for does not exist.",
    });
  }

  return createVenueMetadata({
    name: venue.name,
    city: venue.city,
    state: venue.state || "",
    country: venue.country,
    description: venue.description || "",
    imageUrl: venue.imageUrl || "",
    slug: venue.slug,
    capacity: venue.capacity || 0,
  });
};

const VenuePage = async ({ params }: VenuePageProps) => {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);

  if (!venue) {
    notFound();
  }

  // Fetch venue data
  const [upcomingShows, pastShows, nearbyVenues] = await Promise.all([
    getVenueShows(venue.id, "upcoming"),
    getVenueShows(venue.id, "past"),
    getNearbyVenues(venue.id, venue.latitude, venue.longitude),
  ]);

  const breadcrumbItems = [
    { label: "Venues", href: "/venues" },
    { label: venue.name, isCurrentPage: true },
  ];

  // Process shows data
  const processedUpcomingShows = upcomingShows.map((show) => ({
    ...show,
    date: new Date(show.date),
    artist: {
      ...show.artist,
      genres: show.artist.genres ? JSON.parse(show.artist.genres) : [],
    },
  }));

  const processedPastShows = pastShows.map((show) => ({
    ...show,
    date: new Date(show.date),
    artist: {
      ...show.artist,
      genres: show.artist.genres ? JSON.parse(show.artist.genres) : [],
    },
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <BreadcrumbNavigation items={breadcrumbItems} className="mb-6" />

        {/* Modern Hero Section */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-2xl" />
          <Card className="relative border-0 shadow-xl bg-background/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Venue Image */}
                <div className="relative">
                  <Avatar className="h-32 w-32 lg:h-40 lg:w-40 shadow-lg">
                    <AvatarImage
                      src={venue.imageUrl || ""}
                      alt={venue.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl lg:text-3xl font-bold bg-gradient-to-br from-primary to-primary/60">
                      {venue.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {processedUpcomingShows.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-green-500 hover:bg-green-600 text-white">
                      Live
                    </Badge>
                  )}
                </div>

                {/* Venue Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {venue.name}
                    </h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {venue.city}, {venue.state && `${venue.state}, `}
                        {venue.country}
                      </span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-4">
                    {venue.capacity && (
                      <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                          {venue.capacity.toLocaleString()} capacity
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {processedUpcomingShows.length} upcoming shows
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5">
                      <Music className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {processedPastShows.length} past shows
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {venue.description && (
                    <p className="text-muted-foreground leading-relaxed max-w-2xl">
                      {venue.description}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upcoming Shows - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-primary" />
                    Upcoming Shows
                  </CardTitle>
                  <Badge variant="secondary" className="text-sm">
                    {processedUpcomingShows.length} shows
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {processedUpcomingShows.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
                    <h3 className="text-xl font-semibold mb-2 text-muted-foreground">
                      No Upcoming Shows
                    </h3>
                    <p className="text-muted-foreground">
                      Check back later for upcoming performances at this venue.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {processedUpcomingShows.slice(0, 10).map((show, index) => (
                      <Card
                        key={show.id}
                        className="border border-border/50 hover:border-primary/20 transition-all duration-200 hover:shadow-md"
                      >
                        <CardContent className="p-4">
                          <Link href={`/shows/${show.id}`} className="block">
                            <div className="flex items-center gap-4">
                              {/* Artist Avatar */}
                              <Avatar className="h-16 w-16 shadow-sm">
                                <AvatarImage
                                  src={show.artist.imageUrl || ""}
                                  alt={show.artist.name}
                                  className="object-cover"
                                />
                                <AvatarFallback className="font-semibold text-lg bg-gradient-to-br from-primary/10 to-primary/5">
                                  {show.artist.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>

                              {/* Show Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-lg mb-1 truncate">
                                  {show.artist.name}
                                </h4>
                                <p className="text-muted-foreground text-sm mb-2 line-clamp-1">
                                  {show.name}
                                </p>

                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {format(
                                        show.date,
                                        "MMM d, yyyy • h:mm a",
                                      )}
                                    </span>
                                  </div>
                                </div>

                                {/* Genres */}
                                {show.artist.genres &&
                                  show.artist.genres.length > 0 && (
                                    <div className="flex gap-1 mt-2">
                                      {show.artist.genres
                                        .slice(0, 2)
                                        .map((genre) => (
                                          <Badge
                                            key={genre}
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {genre}
                                          </Badge>
                                        ))}
                                    </div>
                                  )}
                              </div>

                              {/* Action Button */}
                              <div className="flex flex-col gap-2">
                                {show.ticketUrl && (
                                  <Button
                                    size="sm"
                                    className="flex items-center gap-1.5"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      window.open(show.ticketUrl!, "_blank");
                                    }}
                                  >
                                    <Ticket className="h-3 w-3" />
                                    Tickets
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-1.5"
                                >
                                  <Music className="h-3 w-3" />
                                  View Show
                                </Button>
                              </div>
                            </div>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}

                    {processedUpcomingShows.length > 10 && (
                      <div className="text-center pt-4">
                        <Button variant="outline" asChild>
                          <Link href={`/venues/${venue.slug}/shows`}>
                            View All {processedUpcomingShows.length} Shows
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Shows */}
            {processedPastShows.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Recent Shows
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {processedPastShows.slice(0, 5).map((show) => (
                    <Link
                      key={show.id}
                      href={`/shows/${show.id}`}
                      className="block p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={show.artist.imageUrl || ""}
                            alt={show.artist.name}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-sm">
                            {show.artist.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {show.artist.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(show.date, "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}

                  {processedPastShows.length > 5 && (
                    <div className="pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        asChild
                      >
                        <Link href={`/venues/${venue.slug}/past-shows`}>
                          View All Past Shows
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Nearby Venues */}
            {nearbyVenues.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Nearby Venues
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {nearbyVenues.slice(0, 4).map((nearbyVenue) => (
                    <Link
                      key={nearbyVenue.id}
                      href={`/venues/${nearbyVenue.slug}`}
                      className="block p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={nearbyVenue.imageUrl || ""}
                            alt={nearbyVenue.name}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-sm">
                            {nearbyVenue.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {nearbyVenue.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {nearbyVenue.city}, {nearbyVenue.state}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Venue Details */}
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Venue Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">{venue.name}</p>
                      <p className="text-muted-foreground">
                        {venue.city}, {venue.state && `${venue.state}, `}
                        {venue.country}
                      </p>
                    </div>
                  </div>

                  {venue.capacity && (
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="font-medium">Capacity</p>
                        <p className="text-muted-foreground">
                          {venue.capacity.toLocaleString()} people
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenuePage;
