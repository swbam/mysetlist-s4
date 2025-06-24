'use client';

import AnalyticsChart from './analytics-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Activity, Vote, TrendingUp, Clock } from 'lucide-react';

interface EngagementMetricsProps {
  activityData: { date: string; votes: number }[];
  stats: {
    totalVotes: number;
    todayVotes: number;
    activeUsers: number;
    engagementRate: number;
  };
}

export default function EngagementMetrics({ activityData, stats }: EngagementMetricsProps) {
  // Transform data for chart
  const chartData = activityData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    votes: item.votes
  }));

  // Calculate average daily votes
  const avgDailyVotes = chartData.length > 0 
    ? Math.round(chartData.reduce((sum, d) => sum + d.votes, 0) / chartData.length)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVotes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All-time total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayVotes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Votes cast today
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.engagementRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Active users ratio
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDailyVotes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Votes per day (30d)
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Voting Activity</CardTitle>
          <CardDescription>Daily votes over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyticsChart
            data={chartData}
            dataKey="votes"
            color="hsl(var(--primary))"
          />
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Peak Activity Times</CardTitle>
            <CardDescription>When users are most active</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Evening (6PM - 10PM)</span>
                <Badge>45%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Afternoon (12PM - 6PM)</span>
                <Badge variant="secondary">30%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Morning (6AM - 12PM)</span>
                <Badge variant="outline">15%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Night (10PM - 6AM)</span>
                <Badge variant="outline">10%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Engagement Insights</CardTitle>
            <CardDescription>Key engagement metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Users</span>
              <span className="text-sm font-medium">{stats.activeUsers.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Avg. Votes per User</span>
              <span className="text-sm font-medium">
                {stats.activeUsers > 0 ? (stats.totalVotes / stats.activeUsers).toFixed(1) : '0'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Voting Participation</span>
              <span className="text-sm font-medium">
                {stats.activeUsers > 0 ? `${((stats.todayVotes / stats.activeUsers) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}