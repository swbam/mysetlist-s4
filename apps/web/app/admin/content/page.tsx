import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { Button } from '@repo/design-system/components/ui/button';
import { Input } from '@repo/design-system/components/ui/input';
import { Badge } from '@repo/design-system/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/design-system/components/ui/table';
import { 
  Music, 
  MapPin, 
  Calendar,
  CheckCircle,
  Star,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import ContentActions from './components/content-actions';

// Force dynamic rendering due to user-specific data fetching
export const dynamic = 'force-dynamic';

export default async function ContentPage({ params }: { params: Promise<{ locale: string }> }) {
  const supabase = await createClient();
  const { locale } = await params;
  
  // Fetch content data
  const [
    { data: artists },
    { data: venues },
    { data: shows }
  ] = await Promise.all([
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
      .limit(20)
  ]);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Content Management</h1>
        <p className="text-muted-foreground mt-2">
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
                  <CardDescription>Manage artist profiles and verification</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search artists..." className="pl-10 w-64" />
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
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <Music className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{artist.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {artist.genres?.split(',')[0]}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{artist.followers?.toLocaleString() ?? 0} followers</p>
                          <p className="text-muted-foreground">
                            {artist.artist_stats?.[0]?.total_shows ?? 0} shows
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-secondary rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
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
                        {artist.last_synced_at ? 
                          format(new Date(artist.last_synced_at), 'MMM d, yyyy') :
                          'Never'
                        }
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
                  <CardDescription>Manage venue information and details</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search venues..." className="pl-10 w-64" />
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
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <MapPin className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{venue.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {venue.venue_type}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{venue.city}, {venue.state || venue.country}</p>
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
                  <CardDescription>Manage shows and featured events</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search shows..." className="pl-10 w-64" />
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
                          <p className="text-sm text-muted-foreground">
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
                          <p className="text-muted-foreground">{show.venue?.city}</p>
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
                          <Badge variant={
                            show.status === 'completed' ? 'secondary' :
                            show.status === 'ongoing' ? 'default' :
                            show.status === 'cancelled' ? 'destructive' :
                            'outline'
                          }>
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