import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { 
  Users, 
  Music, 
  Calendar, 
  TrendingUp, 
  Activity,
  MapPin,
  Heart,
  Vote
} from 'lucide-react';
import { getUserAnalytics, getPlatformMetrics } from './actions';

async function AnalyticsData() {
  const [userAnalytics, platformMetrics] = await Promise.all([
    getUserAnalytics(),
    getPlatformMetrics()
  ]);

  return (
    <>
      {/* Platform Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformMetrics.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{platformMetrics.newUsersThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shows</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformMetrics.totalShows.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {platformMetrics.upcomingShows} upcoming
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Artists</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformMetrics.totalArtists.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {platformMetrics.verifiedArtists} verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformMetrics.totalVotes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{platformMetrics.votesToday} today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Engagement */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              User Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Daily Active Users</span>
              <Badge variant="secondary">{userAnalytics.dailyActiveUsers}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Weekly Active Users</span>
              <Badge variant="secondary">{userAnalytics.weeklyActiveUsers}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Monthly Active Users</span>
              <Badge variant="secondary">{userAnalytics.monthlyActiveUsers}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Avg. Session Duration</span>
              <Badge variant="outline">{userAnalytics.avgSessionDuration}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Content Quality
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Setlist Accuracy</span>
              <Badge variant="default">{platformMetrics.setlistAccuracy}%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">User Contributions</span>
              <Badge variant="secondary">{platformMetrics.userContributions}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Verified Setlists</span>
              <Badge variant="secondary">{platformMetrics.verifiedSetlists}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Community Reports</span>
              <Badge variant="outline">{platformMetrics.communityReports}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Artists & Venues */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Most Followed Artists
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {platformMetrics.topArtists.map((artist, index) => (
                <div key={artist.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-sm font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="font-medium">{artist.name}</span>
                  </div>
                  <Badge variant="secondary">{artist.followers} followers</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Most Active Venues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {platformMetrics.topVenues.map((venue, index) => (
                <div key={venue.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-sm font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium">{venue.name}</div>
                      <div className="text-xs text-muted-foreground">{venue.city}</div>
                    </div>
                  </div>
                  <Badge variant="secondary">{venue.showCount} shows</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {platformMetrics.avgPageLoadTime}ms
              </div>
              <p className="text-sm text-muted-foreground">Avg. Page Load Time</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {platformMetrics.avgSearchResponseTime}ms
              </div>
              <p className="text-sm text-muted-foreground">Avg. Search Response</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {platformMetrics.apiUptime}%
              </div>
              <p className="text-sm text-muted-foreground">API Uptime</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">Real-time</Badge>
        </div>
      </div>
      
      <Suspense fallback={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      }>
        <AnalyticsData />
      </Suspense>
    </div>
  );
}