"use client";

import { Badge } from "@repo/design-system/badge";
import { Button } from "@repo/design-system/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/dropdown-menu";
import { Input } from "@repo/design-system/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/table";
import { format } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Download,
  Edit,
  Eye,
  Globe,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { toast } from "sonner";

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
  shows_count: number;
}

interface VenuesClientProps {
  initialVenues: Venue[];
  initialStats: {
    totalVenues: number;
    verifiedVenues: number;
    venuesWithShows: number;
    venuesNeedingInfo: number;
  };
}

export default function VenuesClient({ initialVenues, initialStats }: VenuesClientProps) {
  const [venues, setVenues] = useState<Venue[]>(initialVenues);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>(initialVenues);
  const [stats] = useState(initialStats);
  // Loading state removed as unused
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Supabase client removed as unused

  useEffect(() => {
    // Filter venues based on search term and status filter
    let filtered = venues;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(venue =>
        venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.state.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      switch (statusFilter) {
        case "verified":
          filtered = filtered.filter(venue => venue.verified);
          break;
        case "unverified":
          filtered = filtered.filter(venue => !venue.verified);
          break;
        case "with_shows":
          filtered = filtered.filter(venue => venue.shows_count > 0);
          break;
        case "incomplete":
          filtered = filtered.filter(venue => 
            !venue.capacity || !venue.latitude || !venue.longitude
          );
          break;
      }
    }

    setFilteredVenues(filtered);
  }, [venues, searchTerm, statusFilter]);

  const handleExportVenues = async () => {
    try {
      const response = await fetch('/api/admin/venues/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `venues-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Venues exported successfully');
      } else {
        toast.error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export error');
    }
  };

  const handleVerifyVenue = async (venueId: string, venueName: string) => {
    try {
      const response = await fetch(`/api/admin/venues/${venueId}/verify`, {
        method: 'POST',
      });

      if (response.ok) {
        // Update local state
        setVenues(venues.map(venue => 
          venue.id === venueId 
            ? { ...venue, verified: true }
            : venue
        ));
        toast.success(`${venueName} marked as verified`);
      } else {
        toast.error('Failed to verify venue');
      }
    } catch (error) {
      console.error('Verify error:', error);
      toast.error('Error verifying venue');
    }
  };

  const handleDeleteVenue = async (venueId: string, venueName: string) => {
    if (!confirm(`Are you sure you want to delete "${venueName}"? This action cannot be undone and will also delete all associated shows.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/venues/${venueId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setVenues(venues.filter(venue => venue.id !== venueId));
        toast.success('Venue deleted successfully');
      } else {
        toast.error('Failed to delete venue');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Error deleting venue');
    }
  };

  const handleUpdateLocation = async (venueId: string, venueName: string) => {
    try {
      const response = await fetch(`/api/admin/venues/${venueId}/update-location`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success(`Location updated for ${venueName}`);
        // Refresh the venues data
        window.location.reload();
      } else {
        toast.error('Failed to update location');
      }
    } catch (error) {
      console.error('Update location error:', error);
      toast.error('Error updating location');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-bold text-2xl md:text-3xl">Venue Management</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage concert venues, locations, and venue information
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={handleExportVenues}>
            <Download className="mr-2 h-4 w-4" />
            Export Venues
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => toast.info('Add venue feature coming soon')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Venue
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Venues</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {stats.totalVenues.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {stats.verifiedVenues.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">
              {stats.totalVenues > 0
                ? Math.round((stats.verifiedVenues / stats.totalVenues) * 100)
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">With Shows</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {stats.venuesWithShows.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Incomplete Info
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {stats.venuesNeedingInfo.toLocaleString()}
            </div>
            <p className="text-muted-foreground text-xs">
              Need capacity or location
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <div className="relative flex-1">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, city, or address..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Venues</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="with_shows">With Shows</SelectItem>
                <SelectItem value="incomplete">Incomplete Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Venues Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Venue Details</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shows</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVenues.map((venue) => (
                  <TableRow key={venue.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{venue.name}</p>
                          <p className="text-muted-foreground text-sm">
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
                        <p className="text-muted-foreground text-sm">
                          {venue.country} {venue.zip_code}
                        </p>
                        {venue.latitude && venue.longitude && (
                          <p className="mt-1 text-muted-foreground text-xs">
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
                        <Badge variant={venue.verified ? "default" : "secondary"}>
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
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
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
                          <span className="text-muted-foreground text-xs">
                            No contact info
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(venue.created_at), "MMM d, yyyy")}
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
                            <Link href={`/venues/${venue.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Venue Page
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info('Edit venue feature coming soon')}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Venue
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!venue.verified && (
                            <DropdownMenuItem onClick={() => handleVerifyVenue(venue.id, venue.name)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark as Verified
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleUpdateLocation(venue.id, venue.name)}>
                            <MapPin className="mr-2 h-4 w-4" />
                            Update Location
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteVenue(venue.id, venue.name)}
                          >
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}