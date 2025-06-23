'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { format } from 'date-fns';

interface AnalyticsChartProps {
  title: string;
  description?: string;
  data: any[];
  dataKey: string;
  xAxisKey?: string;
}

export default function AnalyticsChart({ 
  title, 
  description, 
  data, 
  dataKey,
  xAxisKey = 'stat_date' 
}: AnalyticsChartProps) {
  // Simple chart visualization using CSS
  const maxValue = Math.max(...data.map(d => d[dataKey] || 0));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-end gap-1 h-48">
            {data.map((item, index) => {
              const value = item[dataKey] || 0;
              const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
              
              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center justify-end"
                >
                  <div className="relative w-full group">
                    <div
                      className="w-full bg-primary transition-all duration-300 hover:bg-primary/80 rounded-t"
                      style={{ height: `${height}%`, minHeight: '2px' }}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {value.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{data[0] && format(new Date(data[0][xAxisKey]), 'MMM d')}</span>
            <span>{data[data.length - 1] && format(new Date(data[data.length - 1][xAxisKey]), 'MMM d')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}