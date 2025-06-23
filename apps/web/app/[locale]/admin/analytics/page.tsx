import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { 
  Users, 
  TrendingUp, 
  Calendar,
  Music,
  MapPin,
  Activity,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import AnalyticsChart from './components/analytics-chart';
import GrowthMetrics from './components/growth-metrics';
import ContentMetrics from './components/content-metrics';
import EngagementMetrics from './components/engagement-metrics';

export default async function AnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const supabase = await createClient();
  const { locale } = await params;
  
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  
  // Fetch platform stats for the last 30 days
  const { data: platformStats } = await supabase
    .from('platform_stats')
    .select('*')
    .gte('stat_date', format(thirtyDaysAgo, 'yyyy-MM-dd'))
    .lte('stat_date', format(today, 'yyyy-MM-dd'))
    .order('stat_date', { ascending: true });
  
  // Get top content
  const [
    { data: topArtists },
    { data: topVenues },
    { data: topShows },
    { data: activeUsers }
  ] = await Promise.all([
    supabase
      .from('artists')
      .select('name, followers, trending_score')
      .order('trending_score', { ascending: false })
      .limit(5),
    supabase
      .from('venues')
      .select('name, city, country')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('shows')
      .select('name, attendee_count, trending_score')
      .order('trending_score', { ascending: false })
      .limit(5),
    supabase
      .from('users')
      .select('display_name, email, last_login_at')
      .gte('last_login_at', format(subDays(today, 7), 'yyyy-MM-dd'))
      .order('last_login_at', { ascending: false })
      .limit(10)
  ]);
  
  // Calculate key metrics
  const latestStats = platformStats?.[platformStats.length - 1];
  const previousStats = platformStats?.[platformStats.length - 8]; // 7 days ago
  
  const calculateGrowth = (current?: number, previous?: number) => {
    if (!current || !previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };
  
  const userGrowth = calculateGrowth(latestStats?.total_users, previousStats?.total_users);
  const contentGrowth = calculateGrowth(
    (latestStats?.total_setlists ?? 0) + (latestStats?.total_reviews ?? 0) + (latestStats?.total_photos ?? 0),
    (previousStats?.total_setlists ?? 0) + (previousStats?.total_reviews ?? 0) + (previousStats?.total_photos ?? 0)
  );
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Platform metrics and performance insights
        </p>
      </div>
      
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestStats?.total_users?.toLocaleString() ?? 0}</div>
            <div className="flex items-center text-xs mt-2">
              {userGrowth > 0 ? (
                <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={userGrowth > 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(userGrowth).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">from last week</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users (7d)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestStats?.active_users?.toLocaleString() ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {((latestStats?.active_users ?? 0) / (latestStats?.total_users ?? 1) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((latestStats?.total_setlists ?? 0) + 
                (latestStats?.total_reviews ?? 0) + 
                (latestStats?.total_photos ?? 0)).toLocaleString()}
            </div>
            <div className="flex items-center text-xs mt-2">
              {contentGrowth > 0 ? (
                <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={contentGrowth > 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(contentGrowth).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">from last week</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestStats?.new_votes?.toLocaleString() ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              votes today
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Analytics Tabs */}
      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
        </TabsList>
        
        <TabsContent value="growth" className="space-y-4">
          <GrowthMetrics platformStats={platformStats ?? []} />
        </TabsContent>
        
        <TabsContent value="content" className="space-y-4">
          <ContentMetrics platformStats={platformStats ?? []} />
        </TabsContent>
        
        <TabsContent value="engagement" className="space-y-4">
          <EngagementMetrics platformStats={platformStats ?? []} />
        </TabsContent>
        
        <TabsContent value="geographic" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Venues by Location</CardTitle>
                <CardDescription>Most popular venue cities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topVenues?.map((venue) => (
                    <div key={venue.name} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{venue.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {venue.city}, {venue.country}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Trending Artists</CardTitle>
                <CardDescription>Artists with highest engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topArtists?.map((artist) => (
                    <div key={artist.name} className="flex items-center justify-between">
                      <p className="font-medium">{artist.name}</p>
                      <div className="text-right">
                        <p className="text-sm font-medium">{artist.followers?.toLocaleString() ?? 0}</p>
                        <p className="text-xs text-muted-foreground">followers</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent User Activity</CardTitle>
          <CardDescription>Most recently active users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeUsers?.map((user) => (
              <div key={user.email} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{user.display_name || 'Anonymous'}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {user.last_login_at && format(new Date(user.last_login_at), 'MMM d, h:mm a')}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}