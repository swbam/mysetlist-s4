import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/design-system/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  MapPin, 
  Plus,
  Download,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  Star,
  Globe,
  Phone,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

// Force dynamic rendering due to user-specific data fetching
export const dynamic = 'force-dynamic';

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  verified: boolean;
  phone?: string;
  email?: string;
  website?: string;
  created_at: string;
  updated_at: string;
  shows_count?: number;
  avg_rating?: number;
  photos_count?: number;
}

export default async function VenuesManagementPage({ params }: { params: Promise<{ locale: string }> }) {
  const supabase = await createClient();
  const { locale } = await params;
  
  // Fetch venues with related data
  const { data: venues } = await supabase
    .from('venues')
    .select(`
      id,
      name,
      address,
      city,
      state,
      country,
      zip_code,
      latitude,
      longitude,
      capacity,
      verified,
      phone,
      email,
      website,
      created_at,
      updated_at,
      shows (count),
      venue_photos (count),
      venue_reviews (rating)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  // Calculate average ratings
  const venuesWithStats = venues?.map(venue => {
    const ratings = venue.venue_reviews || [];
    const avgRating = ratings.length > 0 
      ? ratings.reduce((sum: number, review: any) => sum + review.rating, 0) / ratings.length 
      : 0;
    
    return {
      ...venue,
      shows_count: venue.shows?.[0]?.count || 0,
      photos_count: venue.venue_photos?.[0]?.count || 0,
      avg_rating: avgRating
    };
  }) || [];

  // Get quick stats
  const { count: totalVenues } = await supabase
    .from('venues')
    .select('*', { count: 'exact', head: true });

  const { count: verifiedVenues } = await supabase
    .from('venues')
    .select('*', { count: 'exact', head: true })
    .eq('verified', true);

  const { count: venuesWithShows } = await supabase
    .from('venues')
    .select('id')
    .not('shows', 'is', null);

  const { count: venuesNeedingInfo } = await supabase
    .from('venues')
    .select('*', { count: 'exact', head: true })
    .or('capacity.is.null,latitude.is.null,longitude.is.null');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Venue Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage concert venues, locations, and venue information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Venues
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Venue
          </Button>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Venues</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVenues?.toLocaleString() ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifiedVenues?.toLocaleString() ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {totalVenues ? Math.round((verifiedVenues! / totalVenues) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Shows</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{venuesWithShows?.toLocaleString() ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incomplete Info</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{venuesNeedingInfo?.toLocaleString() ?? 0}</div>
            <p className="text-xs text-muted-foreground">Need capacity or location</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, city, or address..."
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuItem>All Venues</DropdownMenuItem>
                <DropdownMenuItem>Verified</DropdownMenuItem>
                <DropdownMenuItem>Unverified</DropdownMenuItem>
                <DropdownMenuItem>With Shows</DropdownMenuItem>
                <DropdownMenuItem>Incomplete Info</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Filter by Location</DropdownMenuLabel>
                <DropdownMenuItem>United States</DropdownMenuItem>
                <DropdownMenuItem>Canada</DropdownMenuItem>
                <DropdownMenuItem>Europe</DropdownMenuItem>
                <DropdownMenuItem>Other</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
      
      {/* Venues Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venue Details</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Shows & Rating</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venuesWithStats.map((venue) => (
                <TableRow key={venue.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{venue.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {venue.address}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {venue.city}, {venue.state}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {venue.country} {venue.zip_code}
                      </p>
                      {venue.latitude && venue.longitude && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {venue.latitude.toFixed(4)}, {venue.longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {venue.capacity ? (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{venue.capacity.toLocaleString()}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={venue.verified ? 'default' : 'secondary'}>
                        {venue.verified ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Verified
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Unverified
                          </>
                        )}
                      </Badge>
                      {(!venue.capacity || !venue.latitude || !venue.longitude) && (
                        <Badge variant="outline" className="text-orange-600">
                          Incomplete
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {venue.shows_count} shows
                      </p>
                      {venue.avg_rating > 0 && (
                        <p className="flex items-center gap-1 text-muted-foreground">
                          <Star className="h-3 w-3" />
                          {venue.avg_rating.toFixed(1)} rating
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        {venue.photos_count} photos
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm space-y-1">
                      {venue.website && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">Website</span>
                        </div>
                      )}
                      {venue.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">Phone</span>
                        </div>
                      )}
                      {venue.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">Email</span>
                        </div>
                      )}
                      {!venue.website && !venue.phone && !venue.email && (
                        <span className="text-muted-foreground text-xs">No contact info</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(venue.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/${locale}/venues/${venue.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Venue Page
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Venue
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {!venue.verified && (
                          <DropdownMenuItem>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Mark as Verified
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <MapPin className="mr-2 h-4 w-4" />
                          Update Location
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Venue
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}