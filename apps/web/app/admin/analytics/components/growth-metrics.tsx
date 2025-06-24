'use client';

import AnalyticsChart from './analytics-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Progress } from '@repo/design-system/components/ui/progress';

interface GrowthMetricsProps {
  userGrowthData: { date: string; count: number }[];
  stats: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    userGrowth: number;
    activeUserGrowth: number;
  };
}

export default function GrowthMetrics({ userGrowthData, stats }: GrowthMetricsProps) {
  const retentionRate = stats.totalUsers > 0 
    ? (stats.activeUsers / stats.totalUsers * 100).toFixed(1)
    : '0';

  // Transform data for chart
  const chartData = userGrowthData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    users: item.count
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New User Registrations</CardTitle>
            <CardDescription>Daily new users over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <AnalyticsChart
              data={chartData}
              dataKey="users"
              color="hsl(var(--primary))"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Growth Summary</CardTitle>
            <CardDescription>Key growth metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Total Users</span>
                <span className="font-medium">{stats.totalUsers.toLocaleString()}</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>New Users (30d)</span>
                <span className="font-medium">{stats.newUsers.toLocaleString()}</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Active Users (7d)</span>
                <span className="font-medium">{stats.activeUsers.toLocaleString()}</span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Retention Rate</span>
                <span className="font-medium">{retentionRate}%</span>
              </div>
              <Progress value={parseFloat(retentionRate)} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Growth Trends</CardTitle>
          <CardDescription>Week-over-week comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">User Growth</span>
                <span className={`text-sm font-medium ${stats.userGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.userGrowth >= 0 ? '+' : ''}{stats.userGrowth.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.abs(stats.userGrowth)} 
                className="h-2"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Active User Growth</span>
                <span className={`text-sm font-medium ${stats.activeUserGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.activeUserGrowth >= 0 ? '+' : ''}{stats.activeUserGrowth.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.abs(stats.activeUserGrowth)} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}