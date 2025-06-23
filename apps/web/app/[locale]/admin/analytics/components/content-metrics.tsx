'use client';

import AnalyticsChart from './analytics-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { FileText, Image, MessageSquare, Music } from 'lucide-react';

interface ContentMetricsProps {
  platformStats: any[];
}

export default function ContentMetrics({ platformStats }: ContentMetricsProps) {
  const latestStats = platformStats[platformStats.length - 1] || {};
  
  const contentTypes = [
    {
      name: 'Setlists',
      icon: FileText,
      total: latestStats.total_setlists || 0,
      new: latestStats.new_setlists || 0,
      color: 'text-blue-500'
    },
    {
      name: 'Reviews',
      icon: MessageSquare,
      total: latestStats.total_reviews || 0,
      new: latestStats.new_reviews || 0,
      color: 'text-green-500'
    },
    {
      name: 'Photos',
      icon: Image,
      total: latestStats.total_photos || 0,
      new: latestStats.new_photos || 0,
      color: 'text-purple-500'
    },
    {
      name: 'Shows',
      icon: Music,
      total: latestStats.total_shows || 0,
      new: latestStats.new_shows || 0,
      color: 'text-orange-500'
    }
  ];
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {contentTypes.map((type) => (
          <Card key={type.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{type.name}</CardTitle>
              <type.icon className={`h-4 w-4 ${type.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{type.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{type.new} today
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <AnalyticsChart
          title="Content Creation"
          description="New content created daily"
          data={platformStats.map(stat => ({
            ...stat,
            total_content: (stat.new_setlists || 0) + 
                         (stat.new_reviews || 0) + 
                         (stat.new_photos || 0)
          }))}
          dataKey="total_content"
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Content Distribution</CardTitle>
            <CardDescription>Breakdown by content type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contentTypes.map((type) => {
                const totalContent = contentTypes.reduce((sum, t) => sum + t.total, 0);
                const percentage = totalContent > 0 ? (type.total / totalContent * 100).toFixed(1) : 0;
                
                return (
                  <div key={type.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <type.icon className={`h-4 w-4 ${type.color}`} />
                        <span className="text-sm font-medium">{type.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{percentage}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          type.name === 'Setlists' ? 'bg-blue-500' :
                          type.name === 'Reviews' ? 'bg-green-500' :
                          type.name === 'Photos' ? 'bg-purple-500' :
                          'bg-orange-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}