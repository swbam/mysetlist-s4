import { endOfDay, format, startOfDay, subDays } from "date-fns"
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
} from "lucide-react"
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
} from "~/components/ui-exports"
import { createClient } from "~/lib/supabase/server"

// Force dynamic rendering due to user-specific data fetching
export const dynamic = "force-dynamic"

interface AnalyticsData {
  metric: string
  current: number
  previous: number
  change: number
  changePercent: number
  isPositive: boolean
}

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const today = new Date()
  const yesterday = subDays(today, 1)
  const monthAgo = subDays(today, 30)

  // Get current period data
  const [
    { count: totalUsers },
    { count: totalShows },
    { count: totalArtists },
    { count: totalVenues },
    { count: activeUsersToday },
    { count: newUsersToday },
    { count: newShowsToday },
    { count: newContentToday },
    { data: topArtists },
    { data: topVenues },
    { data: recentActivity },
    { data: platformStats },
  ] = await Promise.all([
    // Basic counts
    supabase
      .from("users")
      .select("*", { count: "exact", head: true }),
    supabase.from("shows").select("*", { count: "exact", head: true }),
    supabase.from("artists").select("*", { count: "exact", head: true }),
    supabase.from("venues").select("*", { count: "exact", head: true }),

    // Today's activity
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("last_login_at", startOfDay(today).toISOString())
      .lte("last_login_at", endOfDay(today).toISOString()),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay(today).toISOString())
      .lte("created_at", endOfDay(today).toISOString()),
    supabase
      .from("shows")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay(today).toISOString())
      .lte("created_at", endOfDay(today).toISOString()),
    supabase
      .from("setlists")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay(today).toISOString())
      .lte("created_at", endOfDay(today).toISOString()),

    // Top performing content
    supabase
      .from("artists")
      .select(`
        id,
        name,
        image_url,
        followers,
        popularity,
        artist_stats (total_shows, total_followers)
      `)
      .order("popularity", { ascending: false })
      .limit(10),
    supabase
      .from("venues")
      .select(`
        id,
        name,
        city,
        state,
        capacity,
        venue_reviews (rating),
        shows (count)
      `)
      .limit(10),

    // Recent user activity
    supabase
      .from("user_activity_log")
      .select(`
        *,
        user:users(display_name, email)
      `)
      .order("created_at", { ascending: false })
      .limit(20),

    // Historical platform stats
    supabase
      .from("platform_stats")
      .select("*")
      .gte("stat_date", format(monthAgo, "yyyy-MM-dd"))
      .order("stat_date", { ascending: false }),
  ])

  // Calculate trends
  const calculateTrend = (current: number, previous: number) => {
    const change = current - previous
    const changePercent =
      previous > 0 ? Math.round((change / previous) * 100) : 0
    return {
      current,
      previous,
      change,
      changePercent,
      isPositive: change >= 0,
    }
  }

  // Get yesterday's data for comparison
  const { count: activeUsersYesterday } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("last_login_at", startOfDay(yesterday).toISOString())
    .lte("last_login_at", endOfDay(yesterday).toISOString())

  const metrics: AnalyticsData[] = [
    {
      metric: "Active Users",
      ...calculateTrend(activeUsersToday || 0, activeUsersYesterday || 0),
    },
    {
      metric: "New Users",
      ...calculateTrend(newUsersToday || 0, 0), // Would need yesterday's data
    },
    {
      metric: "New Shows",
      ...calculateTrend(newShowsToday || 0, 0),
    },
    {
      metric: "New Content",
      ...calculateTrend(newContentToday || 0, 0),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Analytics Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Platform metrics, trends, and user insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.metric}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                {metric.metric}
              </CardTitle>
              {metric.isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {metric.current.toLocaleString()}
              </div>
              <div className="mt-1 flex items-center gap-1">
                <span
                  className={`text-xs ${metric.isPositive ? "text-green-500" : "text-red-500"}`}
                >
                  {metric.isPositive ? "+" : ""}
                  {metric.changePercent}%
                </span>
                <span className="text-muted-foreground text-xs">
                  vs yesterday
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {totalUsers?.toLocaleString() ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Shows</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {totalShows?.toLocaleString() ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">in database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Artists</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {totalArtists?.toLocaleString() ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">tracked artists</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Venues</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {totalVenues?.toLocaleString() ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">concert venues</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Content Performance</TabsTrigger>
          <TabsTrigger value="users">User Engagement</TabsTrigger>
          <TabsTrigger value="trends">Platform Trends</TabsTrigger>
        </TabsList>

        {/* Content Performance */}
        <TabsContent value="content" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Artists */}
            <Card>
              <CardHeader>
                <CardTitle>Top Artists by Popularity</CardTitle>
                <CardDescription>
                  Most popular artists on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topArtists?.slice(0, 8).map((artist, index) => (
                    <div key={artist.id} className="flex items-center gap-3">
                      <div className="w-6 text-center font-medium text-muted-foreground text-sm">
                        {index + 1}
                      </div>
                      {artist.image_url ? (
                        <img
                          src={artist.image_url}
                          alt={artist.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <Music className="h-4 w-4" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{artist.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {artist.followers?.toLocaleString() ?? 0} followers
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="h-1.5 w-16 rounded-full bg-secondary">
                          <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${artist.popularity}%` }}
                          />
                        </div>
                        <p className="mt-1 text-muted-foreground text-xs">
                          {artist.popularity}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Venues */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Venues</CardTitle>
                <CardDescription>Most active concert venues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topVenues?.slice(0, 8).map((venue, index) => {
                    const avgRating =
                      venue.venue_reviews?.length > 0
                        ? venue.venue_reviews.reduce(
                            (sum: number, review: any) => sum + review.rating,
                            0
                          ) / venue.venue_reviews.length
                        : 0
                    const showCount = venue.shows?.[0]?.count || 0

                    return (
                      <div key={venue.id} className="flex items-center gap-3">
                        <div className="w-6 text-center font-medium text-muted-foreground text-sm">
                          {index + 1}
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{venue.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {venue.city}, {venue.state}
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{showCount} shows</span>
                          </div>
                          {avgRating > 0 && (
                            <div className="mt-1 flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              <span>{avgRating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Engagement */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent User Activity</CardTitle>
              <CardDescription>
                Latest actions taken by users on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity?.slice(0, 15).map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                            <span className="text-xs">
                              {activity.user?.display_name?.[0] ||
                                activity.user?.email?.[0] ||
                                "?"}
                            </span>
                          </div>
                          <span className="text-sm">
                            {activity.user?.display_name ||
                              activity.user?.email ||
                              "Anonymous"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{activity.action}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {activity.details}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(activity.created_at), "MMM d, h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Platform Trends */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Growth Metrics</CardTitle>
                <CardDescription>
                  Platform growth over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {platformStats?.slice(0, 7).map((stat, _index) => (
                    <div
                      key={stat.id}
                      className="flex items-center justify-between"
                    >
                      <div className="text-sm">
                        <p className="font-medium">
                          {format(new Date(stat.stat_date), "MMM d")}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {format(new Date(stat.stat_date), "EEEE")}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p>{stat.new_users} new users</p>
                        <p className="text-muted-foreground">
                          {stat.active_users} active
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Creation</CardTitle>
                <CardDescription>User-generated content trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {platformStats?.slice(0, 7).map((stat, _index) => (
                    <div
                      key={stat.id}
                      className="flex items-center justify-between"
                    >
                      <div className="text-sm">
                        <p className="font-medium">
                          {format(new Date(stat.stat_date), "MMM d")}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p>{stat.new_setlists || 0} setlists</p>
                        <p className="text-muted-foreground">
                          {stat.new_reviews || 0} reviews,{" "}
                          {stat.new_photos || 0} photos
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
