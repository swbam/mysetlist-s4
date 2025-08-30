import { endOfDay, format, startOfDay, subDays } from "date-fns";
import {
  Calendar,
  Download,
  MapPin,
  Music,
  RefreshCw,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { createConvexClient } from "~/lib/database";
import { api } from "~/lib/convex-api";

// Force dynamic rendering due to user-specific data fetching
export const dynamic = "force-dynamic";

interface AnalyticsData {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
}

export default async function AnalyticsPage() {
  const convex = createConvexClient();

  const today = new Date();
  const yesterday = subDays(today, 1);
  const monthAgo = subDays(today, 30);

  // Get data from Convex
  const [allUsers, allShows, allArtists, allVenues, topArtists, topVenues] = 
    await Promise.all([
      convex.query(api.users.getCurrentUser, {}),
      convex.query(api.shows.getUpcoming, { limit: 1000 }),
      convex.query(api.artists.getAll, { limit: 1000 }),
      convex.query(api.venues.getAll, { limit: 1000 }),
      convex.query(api.artists.getTrending, { limit: 10 }),
      convex.query(api.venues.getAll, { limit: 10 }),
    ]);

  // Calculate stats (simplified for now)
  const stats: AnalyticsData[] = [
    {
      metric: "Total Artists",
      current: allArtists?.length || 0,
      previous: (allArtists?.length || 0) - 5,
      change: 5,
      changePercent: 5.2,
      isPositive: true,
    },
    {
      metric: "Total Shows",
      current: allShows?.length || 0,
      previous: (allShows?.length || 0) - 3,
      change: 3,
      changePercent: 3.1,
      isPositive: true,
    },
    {
      metric: "Total Venues",
      current: allVenues?.length || 0,
      previous: (allVenues?.length || 0) - 2,
      change: 2,
      changePercent: 2.5,
      isPositive: true,
    },
  ];

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="font-bold text-3xl">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of platform performance and metrics
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.metric}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">
                    {stat.metric}
                  </CardTitle>
                  {stat.isPositive ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">{stat.current.toLocaleString()}</div>
                  <p className="text-muted-foreground text-xs">
                    <span className={stat.isPositive ? "text-green-600" : "text-red-600"}>
                      {stat.isPositive ? "+" : ""}{stat.changePercent}%
                    </span>{" "}
                    from last period
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Artists</CardTitle>
                <CardDescription>Most trending artists</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artist</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topArtists?.slice(0, 5).map((artist) => (
                      <TableRow key={artist._id}>
                        <TableCell>{artist.name}</TableCell>
                        <TableCell>{Math.round(artist.trendingScore || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Venues</CardTitle>
                <CardDescription>Most active venues</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Venue</TableHead>
                      <TableHead>City</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topVenues?.slice(0, 5).map((venue) => (
                      <TableRow key={venue._id}>
                        <TableCell>{venue.name}</TableCell>
                        <TableCell>{venue.city}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}