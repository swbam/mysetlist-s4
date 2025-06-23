'use client';

import AnalyticsChart from './analytics-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { ThumbsUp, MessageSquare, Users, TrendingUp } from 'lucide-react';

interface EngagementMetricsProps {
  platformStats: any[];
}

export default function EngagementMetrics({ platformStats }: EngagementMetricsProps) {
  const calculateEngagementRate = (stat: any) => {
    if (!stat.active_users || stat.active_users === 0) return 0;
    const engagementActions = (stat.new_votes || 0) + 
                            (stat.new_reviews || 0) + 
                            (stat.new_photos || 0);
    return (engagementActions / stat.active_users * 100).toFixed(1);
  };
  
  const latestStats = platformStats[platformStats.length - 1] || {};
  const weekAgoStats = platformStats[Math.max(0, platformStats.length - 8)] || {};
  
  const engagementMetrics = [
    {
      name: 'Daily Votes',
      icon: ThumbsUp,
      value: latestStats.new_votes || 0,
      previousValue: weekAgoStats.new_votes || 0,
      color: 'text-blue-500'
    },
    {
      name: 'User Reviews',
      icon: MessageSquare,
      value: latestStats.new_reviews || 0,
      previousValue: weekAgoStats.new_reviews || 0,
      color: 'text-green-500'
    },
    {
      name: 'Active Users',
      icon: Users,
      value: latestStats.active_users || 0,
      previousValue: weekAgoStats.active_users || 0,
      color: 'text-purple-500'
    },
    {
      name: 'Engagement Rate',
      icon: TrendingUp,
      value: parseFloat(String(calculateEngagementRate(latestStats))),
      previousValue: parseFloat(String(calculateEngagementRate(weekAgoStats))),
      suffix: '%',
      color: 'text-orange-500'
    }
  ];
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {engagementMetrics.map((metric) => {
          const change = metric.previousValue > 0 
            ? ((metric.value - metric.previousValue) / metric.previousValue * 100).toFixed(1)
            : 0;
          
          return (
            <Card key={metric.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metric.value.toLocaleString()}{metric.suffix}
                </div>
                <p className={`text-xs ${Number(change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Number(change) >= 0 ? '+' : ''}{change}% from last week
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <AnalyticsChart
          title="Daily Engagement"
          description="Total engagement actions per day"
          data={platformStats.map(stat => ({
            ...stat,
            total_engagement: (stat.new_votes || 0) + 
                            (stat.new_reviews || 0) + 
                            (stat.new_photos || 0)
          }))}
          dataKey="total_engagement"
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Engagement Breakdown</CardTitle>
            <CardDescription>Types of user interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Votes</span>
                  <span className="text-sm text-muted-foreground">
                    {latestStats.new_votes?.toLocaleString() || 0} today
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Content Created</span>
                  <span className="text-sm text-muted-foreground">
                    {((latestStats.new_setlists || 0) + 
                      (latestStats.new_reviews || 0) + 
                      (latestStats.new_photos || 0)).toLocaleString()} items
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average per User</span>
                  <span className="text-sm text-muted-foreground">
                    {latestStats.active_users > 0 
                      ? (latestStats.new_votes / latestStats.active_users).toFixed(2)
                      : 0} votes
                  </span>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Weekly Trend</h4>
                <div className="space-y-2">
                  {platformStats.slice(-7).map((stat, index) => {
                    const dayEngagement = calculateEngagementRate(stat);
                    
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-12">
                          {new Date(stat.stat_date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <div className="flex-1 bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${Math.min(100, Number(dayEngagement) * 10)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-12 text-right">
                          {dayEngagement}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}