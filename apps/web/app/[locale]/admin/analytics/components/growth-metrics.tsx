'use client';

import AnalyticsChart from './analytics-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';

interface GrowthMetricsProps {
  platformStats: any[];
}

export default function GrowthMetrics({ platformStats }: GrowthMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AnalyticsChart
        title="User Growth"
        description="Total users over time"
        data={platformStats}
        dataKey="total_users"
      />
      
      <AnalyticsChart
        title="New Users"
        description="Daily new user registrations"
        data={platformStats}
        dataKey="new_users"
      />
      
      <AnalyticsChart
        title="Active Users"
        description="7-day active users"
        data={platformStats}
        dataKey="active_users"
      />
      
      <Card>
        <CardHeader>
          <CardTitle>User Retention</CardTitle>
          <CardDescription>User activity metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {platformStats.slice(-7).map((stat) => {
              const retentionRate = stat.total_users > 0 
                ? (stat.active_users / stat.total_users * 100).toFixed(1)
                : 0;
              
              return (
                <div key={stat.stat_date} className="flex items-center justify-between">
                  <span className="text-sm">
                    {new Date(stat.stat_date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${retentionRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {retentionRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}