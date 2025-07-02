import { createServiceClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { TrendingUp, Clock, Eye, Users } from 'lucide-react';

async function fetchStats() {
  try {
    const supabase = await createServiceClient();
    const { data } = await supabase
      .rpc('admin_dashboard_stats'); // assumes view exists and function returns row

    // Fallback shape if view/function not present
    return {
      trending_artists: data?.total_users ?? 0,
      hot_shows: data?.total_shows ?? 0,
      search_volume: data?.total_searches ?? 0,
      active_users: data?.active_users ?? 0,
    } as any;
  } catch (e) {
    console.error(e);
    return {
      trending_artists: 0,
      hot_shows: 0,
      search_volume: 0,
      active_users: 0,
    };
  }
}

export async function QuickStats() {
  const stats = await fetchStats();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Trending Artists</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.trending_artists}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hot Shows</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.hot_shows}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Search Volume</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.search_volume}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.active_users}</div>
        </CardContent>
      </Card>
    </div>
  );
}