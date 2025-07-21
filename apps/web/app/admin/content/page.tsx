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
} from '~/components/ui-exports';
import { format } from 'date-fns';
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
} from 'lucide-react';
import { createClient } from '~/lib/supabase/server';
import ContentActions from './components/content-actions';
import { SyncPopularArtistsButton } from './components/sync-popular-artists-button';

// Force dynamic rendering due to user-specific data fetching
export const dynamic = 'force-dynamic';

export default async function ContentPage({
  params,
}: { params: Promise<{ locale: string }> }) {
  const supabase = await createClient();
  const { locale } = await params;

  // Fetch content data
  const [{ data: artists }, { data: venues }, { data: shows }] =
    await Promise.all([
      supabase
        .from('artists')
        .select('*, artist_stats(*)')
        .order('trending_score', { ascending: false })
        .limit(20),
      supabase
        .from('venues')
        .select('*, _reviews:venue_reviews(count), _photos:venue_photos(count)')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('shows')
        .select(`
        *,
        headliner:artists!shows_headliner_artist_id_fkey(name),
        venue:venues(name, city),
        _attendees:show_attendees(count),
        _setlists:setlists(count)
      `)
        .order('trending_score', { ascending: false })
        .limit(20),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">
          Content Management
        </h1>
        <p className="text-muted-foreground">
          Manage and sync content from external sources
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <Button variant="outline" className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              Sync Artists
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
            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Import Shows
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
            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Import Setlists
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
              Manage user-generated content and reviews
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Badge variant="secondary">42 Pending</Badge>
              <Badge variant="outline">128 Flagged</Badge>
            </div>
            <Button variant="outline" className="w-full">
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
            <Button variant="outline" className="w-full">
              Run Quality Check
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

      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl">Content Management</h1>
        <p className="mt-2 text-muted-foreground">
          Manage artists, venues, shows, and featured content
        </p>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="artists" className="space-y-4">
        <TabsList>
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
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search artists..."
                      className="w-64 pl-10"
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
              <Table>
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
                  {artists?.map((artist) => (
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
                              {artist.genres?.split(',')[0]}
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
                              'MMM d, yyyy'
                            )
                          : 'Never'}
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
              <Table>
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
                  {venues?.map((venue) => (
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
                        {venue.capacity?.toLocaleString() ?? 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{venue._reviews?.[0]?.count ?? 0} reviews</p>
                          <p className="text-muted-foreground">
                            {venue._photos?.[0]?.count ?? 0} photos
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(venue.created_at), 'MMM d, yyyy')}
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
              <Table>
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
                  {shows?.map((show) => (
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
                        {format(new Date(show.date), 'MMM d, yyyy')}
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
                              show.status === 'completed'
                                ? 'secondary'
                                : show.status === 'ongoing'
                                  ? 'default'
                                  : show.status === 'cancelled'
                                    ? 'destructive'
                                    : 'outline'
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
