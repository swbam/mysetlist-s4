import { createClient } from "@/lib/supabase/server";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/design-system/components/ui/table";
import { format } from "date-fns";
import {
	Calendar,
	CheckCircle,
	Clock,
	Download,
	Edit,
	Eye,
	Filter,
	MapPin,
	MoreHorizontal,
	Music,
	Plus,
	RefreshCw,
	Search,
	Trash2,
	XCircle,
} from "lucide-react";
import Link from "next/link";

// Force dynamic rendering due to user-specific data fetching
export const dynamic = "force-dynamic";

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

export default async function ShowsManagementPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const supabase = await createClient();
	const { locale } = await params;

	// Fetch shows with related data
	const { data: shows } = await supabase
		.from("shows")
		.select(`
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
    `)
		.order("date", { ascending: false })
		.limit(100);

	// Get quick stats
	const { count: totalShows } = await supabase
		.from("shows")
		.select("*", { count: "exact", head: true });

	const { count: upcomingShows } = await supabase
		.from("shows")
		.select("*", { count: "exact", head: true })
		.eq("status", "upcoming");

	const { count: completedShows } = await supabase
		.from("shows")
		.select("*", { count: "exact", head: true })
		.eq("status", "completed");

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

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Show Management</h1>
					<p className="text-muted-foreground mt-2">
						Manage concerts, events, and show information
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline">
						<RefreshCw className="mr-2 h-4 w-4" />
						Sync from Ticketmaster
					</Button>
					<Button variant="outline">
						<Download className="mr-2 h-4 w-4" />
						Export Shows
					</Button>
					<Button>
						<Plus className="mr-2 h-4 w-4" />
						Add Show
					</Button>
				</div>
			</div>

			{/* Quick Stats */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Shows</CardTitle>
						<Calendar className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{totalShows?.toLocaleString() ?? 0}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Upcoming</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{upcomingShows?.toLocaleString() ?? 0}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Completed</CardTitle>
						<CheckCircle className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{completedShows?.toLocaleString() ?? 0}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">This Month</CardTitle>
						<Calendar className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{shows?.filter(
								(show) =>
									new Date(show.date).getMonth() === new Date().getMonth(),
							).length ?? 0}
						</div>
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
								placeholder="Search by artist, venue, or show title..."
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
								<DropdownMenuItem>All Shows</DropdownMenuItem>
								<DropdownMenuItem>Upcoming</DropdownMenuItem>
								<DropdownMenuItem>In Progress</DropdownMenuItem>
								<DropdownMenuItem>Completed</DropdownMenuItem>
								<DropdownMenuItem>Cancelled</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuLabel>Filter by Date</DropdownMenuLabel>
								<DropdownMenuItem>Today</DropdownMenuItem>
								<DropdownMenuItem>This Week</DropdownMenuItem>
								<DropdownMenuItem>This Month</DropdownMenuItem>
								<DropdownMenuItem>Past Events</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</CardContent>
			</Card>

			{/* Shows Table */}
			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Artist & Show</TableHead>
								<TableHead>Venue & Location</TableHead>
								<TableHead>Date & Time</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Engagement</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{shows?.map((show) => {
								const StatusIcon = getStatusIcon(show.status);

								return (
									<TableRow key={show.id}>
										<TableCell>
											<div className="flex items-center gap-3">
												{show.artist?.image_url ? (
													<img
														src={Array.isArray(show.artist) ? show.artist[0]?. : show.artist?.image_url}
														alt={Array.isArray(show.artist) ? show.artist[0]?. : show.artist?.name}
														className="h-10 w-10 rounded-full object-cover"
													/>
												) : (
													<div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
														<Music className="h-4 w-4" />
													</div>
												)}
												<div>
													<p className="font-medium">
														{show.artist?.name || "Unknown Artist"}
													</p>
													<p className="text-sm text-muted-foreground">
														{show.title}
													</p>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<MapPin className="h-4 w-4 text-muted-foreground" />
												<div>
													<p className="font-medium">
														{show.venue?.name || "Unknown Venue"}
													</p>
													<p className="text-sm text-muted-foreground">
														{show.venue?.city}, {show.venue?.state}
													</p>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div>
												<p className="font-medium">
													{format(new Date(show.date), "MMM d, yyyy")}
												</p>
												{show.time && (
													<p className="text-sm text-muted-foreground">
														{show.time}
													</p>
												)}
											</div>
										</TableCell>
										<TableCell>
											<Badge variant={getStatusColor(show.status)}>
												<StatusIcon className="mr-1 h-3 w-3" />
												{show.status.replace("_", " ")}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="text-sm">
												<p>{show.setlists_count || 0} setlists</p>
												<p className="text-muted-foreground">
													{show.attendees_count || 0} attendees
												</p>
											</div>
										</TableCell>
										<TableCell>
											{format(new Date(show.created_at), "MMM d, yyyy")}
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
														<Link href={`/${locale}/shows/${show.id}`}>
															<Eye className="mr-2 h-4 w-4" />
															View Show Page
														</Link>
													</DropdownMenuItem>
													<DropdownMenuItem>
														<Edit className="mr-2 h-4 w-4" />
														Edit Show
													</DropdownMenuItem>
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
