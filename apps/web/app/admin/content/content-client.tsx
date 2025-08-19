"use client";

import { format } from "date-fns";
import {
  Building,
  Calendar,
  CheckCircle,
  Download,
  Filter,
  MapPin,
  Music,
  Music2,
  RotateCcw,
  Search,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui-exports";
import { toast } from "~/components/ui-exports";
import ContentActions from "./components/content-actions";
import { SyncPopularArtistsButton } from "./components/sync-popular-artists-button";

interface ContentClientProps {
  artists: any[];
  venues: any[];
  shows: any[];
  locale: string;
}

export default function ContentClient({ artists, venues, shows, locale }: ContentClientProps) {
  const [artistSearch, setArtistSearch] = useState("");
  const [venueSearch, setVenueSearch] = useState("");
  const [showSearch, setShowSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredArtists = artists.filter(artist =>
    artist.name.toLowerCase().includes(artistSearch.toLowerCase()) ||
    artist.genres?.toLowerCase().includes(artistSearch.toLowerCase())
  );

  const filteredVenues = venues.filter(venue =>
    venue.name.toLowerCase().includes(venueSearch.toLowerCase()) ||
    venue.city?.toLowerCase().includes(venueSearch.toLowerCase()) ||
    venue.state?.toLowerCase().includes(venueSearch.toLowerCase())
  );

  const filteredShows = shows.filter(show =>
    show.name?.toLowerCase().includes(showSearch.toLowerCase()) ||
    show.headliner?.name?.toLowerCase().includes(showSearch.toLowerCase()) ||
    show.venue?.name?.toLowerCase().includes(showSearch.toLowerCase())
  );

  const handleSyncArtists = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/content/sync-artists', {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Artists synced",
          description: `Successfully synced ${result.count || 0} artists.`,
        });
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Failed to sync artists. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportShows = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/content/import-shows', {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Shows imported",
          description: `Successfully imported ${result.count || 0} shows.`,
        });
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import shows. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportSetlists = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/content/import-setlists', {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Setlists imported",
          description: `Successfully imported ${result.count || 0} setlists.`,
        });
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import setlists. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewContent = () => {
    window.location.href = '/admin/moderation';
  };

  const handleQualityCheck = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/content/quality-check', {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Quality check completed",
          description: `Found ${result.issues || 0} issues that need attention.`,
        });
      } else {
        throw new Error('Quality check failed');
      }
    } catch (error) {
      toast({
        title: "Quality check failed",
        description: "Failed to run quality check. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-bold text-2xl md:text-3xl tracking-tight">
          Content Management
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Manage and sync content from external sources
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Popular Artists Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Popular Artists
            </CardTitle>
            <CardDescription>
              Sync popular artists from Spotify to populate the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm">
                <strong>Genres:</strong> Rock, Pop, Hip-Hop, Electronic, Indie,
                Country, Jazz, Classical
              </div>
              <div className="text-muted-foreground text-sm">
                Syncs ~50 popular artists with their top tracks and metadata
              </div>
            </div>
            <SyncPopularArtistsButton />
          </CardContent>
        </Card>

        {/* Artist Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music2 className="h-5 w-5" />
              Artist Data
            </CardTitle>
            <CardDescription>
              Sync individual artist information from Spotify
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-muted-foreground text-sm">
              Update artist profiles, images, and popularity metrics
            </div>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleSyncArtists}
              disabled={loading}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {loading ? "Syncing..." : "Sync Artists"}
            </Button>
          </CardContent>
        </Card>

        {/* Shows & Venues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Shows & Events
            </CardTitle>
            <CardDescription>
              Import upcoming shows and venue information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-muted-foreground text-sm">
              Sync with Ticketmaster and other event sources
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleImportShows}
              disabled={loading}
            >
              <Download className="mr-2 h-4 w-4" />
              {loading ? "Importing..." : "Import Shows"}
            </Button>
          </CardContent>
        </Card>

        {/* Historical Setlists */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Historical Setlists
            </CardTitle>
            <CardDescription>
              Import setlist data from Setlist.fm
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-muted-foreground text-sm">
              Populate historical concert setlists for popular artists
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleImportSetlists}
              disabled={loading}
            >
              <Download className="mr-2 h-4 w-4" />
              {loading ? "Importing..." : "Import Setlists"}
            </Button>
          </CardContent>
        </Card>

        {/* User Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Content
            </CardTitle>
            <CardDescription>
              Manage user-generated content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Badge variant="secondary">42 Pending</Badge>
              <Badge variant="outline">128 Flagged</Badge>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleReviewContent}
            >
              Review Content
            </Button>
          </CardContent>
        </Card>

        {/* Data Quality */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music2 className="h-5 w-5" />
              Data Quality
            </CardTitle>
            <CardDescription>
              Check and improve data completeness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div>
                Artists missing images: <Badge variant="outline">23</Badge>
              </div>
              <div>
                Shows without setlists: <Badge variant="outline">156</Badge>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleQualityCheck}
              disabled={loading}
            >
              {loading ? "Checking..." : "Run Quality Check"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div>
        <h2 className="mb-4 font-semibold text-xl">Recent Sync Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">Popular Artists Sync</div>
              <div className="text-muted-foreground text-sm">
                45 artists synced successfully
              </div>
            </div>
            <div className="text-muted-foreground text-sm">2 hours ago</div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">Venue Data Update</div>
              <div className="text-muted-foreground text-sm">
                123 venues updated from Ticketmaster
              </div>
            </div>
            <div className="text-muted-foreground text-sm">1 day ago</div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="font-medium">Setlist Import</div>
              <div className="text-muted-foreground text-sm">
                89 historical setlists imported
              </div>
            </div>
            <div className="text-muted-foreground text-sm">3 days ago</div>
          </div>
        </div>
      </div>

      {/* Content Tables Header */}
      <div className="space-y-2">
        <h2 className="font-bold text-xl md:text-2xl">Content Tables</h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Manage artists, venues, shows, and featured content
        </p>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="artists" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="artists">Artists</TabsTrigger>
          <TabsTrigger value="venues">Venues</TabsTrigger>
          <TabsTrigger value="shows">Shows</TabsTrigger>
        </TabsList>

        {/* Artists Tab */}
        <TabsContent value="artists" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Artists</CardTitle>
                  <CardDescription>
                    Manage artist profiles and verification
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                  <div className="relative flex-1">
                    <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search artists..."
                      className="pl-10"
                      value={artistSearch}
                      onChange={(e) => setArtistSearch(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artist</TableHead>
                      <TableHead>Stats</TableHead>
                      <TableHead>Popularity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Synced</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArtists?.map((artist) => (
                      <TableRow key={artist.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {artist.image_url ? (
                              <img
                                src={artist.image_url}
                                alt={artist.name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                <Music className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{artist.name}</p>
                              <p className="text-muted-foreground text-sm">
                                {artist.genres?.split(",")[0]}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>
                              {artist.followers?.toLocaleString() ?? 0} followers
                            </p>
                            <p className="text-muted-foreground">
                              {artist.artist_stats?.[0]?.total_shows ?? 0} shows
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-secondary">
                              <div
                                className="h-2 rounded-full bg-primary"
                                style={{ width: `${artist.popularity}%` }}
                              />
                            </div>
                            <span className="text-sm">{artist.popularity}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {artist.verified ? (
                            <Badge variant="default">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Unverified</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {artist.last_synced_at
                            ? format(
                                new Date(artist.last_synced_at),
                                "MMM d, yyyy",
                              )
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <ContentActions
                            type="artist"
                            item={artist}
                            locale={locale}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Venues Tab */}
        <TabsContent value="venues" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Venues</CardTitle>
                  <CardDescription>
                    Manage venue information and details
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search venues..."
                      className="w-64 pl-10"
                      value={venueSearch}
                      onChange={(e) => setVenueSearch(e.target.value)}
                    />
                  </div>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Venue</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVenues?.map((venue) => (
                      <TableRow key={venue.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {venue.image_url ? (
                              <img
                                src={venue.image_url}
                                alt={venue.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                                <MapPin className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{venue.name}</p>
                              <p className="text-muted-foreground text-sm">
                                {venue.venue_type}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>
                              {venue.city}, {venue.state || venue.country}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {venue.capacity?.toLocaleString() ?? "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{venue.total_shows ?? 0} total shows</p>
                            <p className="text-muted-foreground">
                              {venue.upcoming_shows ?? 0} upcoming
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(venue.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <ContentActions
                            type="venue"
                            item={venue}
                            locale={locale}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shows Tab */}
        <TabsContent value="shows" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Shows</CardTitle>
                  <CardDescription>
                    Manage shows and featured events
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search shows..."
                      className="w-64 pl-10"
                      value={showSearch}
                      onChange={(e) => setShowSearch(e.target.value)}
                    />
                  </div>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Show</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Stats</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShows?.map((show) => (
                      <TableRow key={show.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{show.name}</p>
                            <p className="text-muted-foreground text-sm">
                              {show.headliner?.name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(show.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{show.venue?.name}</p>
                            <p className="text-muted-foreground">
                              {show.venue?.city}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{show.attendee_count} attendees</p>
                            <p className="text-muted-foreground">
                              {show._setlists?.[0]?.count ?? 0} setlists
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge
                              variant={
                                show.status === "completed"
                                  ? "secondary"
                                  : show.status === "ongoing"
                                    ? "default"
                                    : show.status === "cancelled"
                                      ? "destructive"
                                      : "outline"
                              }
                            >
                              {show.status}
                            </Badge>
                            {show.is_featured && (
                              <Badge variant="default">
                                <Star className="mr-1 h-3 w-3" />
                                Featured
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <ContentActions
                            type="show"
                            item={show}
                            locale={locale}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}