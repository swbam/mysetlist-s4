"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Edit,
  ExternalLink,
  Eye,
  Filter,
  MoreHorizontal,
  Music,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "~/lib/supabase/client";

interface Show {
  id: string;
  title: string;
  date: string;
  time: string;
  status: "upcoming" | "in_progress" | "completed" | "cancelled";
  venue: {
    name: string;
    city: string;
    state: string;
  };
  artist: {
    name: string;
    image_url?: string;
  };
  ticket_url?: string;
  created_at: string;
  updated_at: string;
  setlists_count?: number;
  attendees_count?: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "upcoming":
      return "default";
    case "in_progress":
      return "secondary";
    case "completed":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "upcoming":
      return Clock;
    case "in_progress":
      return Calendar;
    case "completed":
      return CheckCircle;
    case "cancelled":
      return XCircle;
    default:
      return Clock;
  }
};

export default function ShowsManagementPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [totalShows, setTotalShows] = useState(0);
  const [upcomingShows, setUpcomingShows] = useState(0);
  const [completedShows, setCompletedShows] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();

    // Fetch shows with related data
    const { data: showsData } = await supabase
      .from("shows")
      .select(
        `
				id,
				title,
				date,
				time,
				status,
				ticket_url,
				created_at,
				updated_at,
				venue:venues (
					name,
					city,
					state
				),
				artist:artists (
					name,
					image_url
				),
				setlists (count),
				attendees (count)
			`,
      )
      .order("date", { ascending: false })
      .limit(100);

    // Get quick stats
    const { count: total } = await supabase
      .from("shows")
      .select("*", { count: "exact", head: true });

    const { count: upcoming } = await supabase
      .from("shows")
      .select("*", { count: "exact", head: true })
      .eq("status", "upcoming");

    const { count: completed } = await supabase
      .from("shows")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    // Transform the data to match the expected structure
    const transformedShows = (showsData || []).map((show: any) => ({
      ...show,
      venue: show.venue?.[0] || { name: "", city: "", state: "" },
      artist: show.artist?.[0] || { name: "", image_url: "" },
      setlists_count: show.setlists?.[0]?.count || 0,
      attendees_count: show.attendees?.[0]?.count || 0,
    }));

    setShows(transformedShows);
    setTotalShows(total || 0);
    setUpcomingShows(upcoming || 0);
    setCompletedShows(completed || 0);
    setLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Show Management</h1>
          <p className="mt-2 text-muted-foreground">
            Manage concerts, events, and show information
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button asChild>
            <Link href="/admin/shows/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Show
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Shows</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{totalShows}</div>
            <p className="text-muted-foreground text-xs">
              All time shows in the system
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Upcoming Shows
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{upcomingShows}</div>
            <p className="text-muted-foreground text-xs">
              Scheduled for the future
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Completed Shows
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{completedShows}</div>
            <p className="text-muted-foreground text-xs">
              Successfully finished
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Average Setlists
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">2.4</div>
            <p className="text-muted-foreground text-xs">Per show average</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Search and filter shows by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shows, artists, venues..."
                className="pl-10"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="date_desc">
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Date (Newest)</SelectItem>
                <SelectItem value="date_asc">Date (Oldest)</SelectItem>
                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shows Table */}
      <Card>
        <CardHeader>
          <CardTitle>Shows</CardTitle>
          <CardDescription>
            A list of all shows with their details and actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Show</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Setlists</TableHead>
                <TableHead>Attendees</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shows.map((show) => {
                const StatusIcon = getStatusIcon(show.status);
                return (
                  <TableRow key={show.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {show.artist?.image_url ? (
                          <img
                            src={show.artist.image_url}
                            alt={show.artist.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <Music className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{show.title}</div>
                          <div className="text-muted-foreground text-sm">
                            {show.artist?.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {new Date(show.date).toLocaleDateString()}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {show.time || "Time TBA"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{show.venue?.name}</div>
                        <div className="text-muted-foreground text-sm">
                          {show.venue?.city}, {show.venue?.state}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(show.status)}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {show.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        {show.setlists_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        {show.attendees_count || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/shows/${show.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/shows/${show.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Show
                            </Link>
                          </DropdownMenuItem>
                          {show.ticket_url && (
                            <DropdownMenuItem asChild>
                              <a
                                href={show.ticket_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Tickets
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Sync from Ticketmaster
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Show
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
