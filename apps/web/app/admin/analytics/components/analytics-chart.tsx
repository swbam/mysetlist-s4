'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { format } from 'date-fns';

interface AnalyticsChartProps {
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  color?: string;
}

export default function AnalyticsChart({ 
  data, 
  dataKey,
  xAxisKey = 'date',
  color = 'hsl(var(--primary))'
}: AnalyticsChartProps) {
  // Simple chart visualization using CSS
  const maxValue = Math.max(...data.map(d => d[dataKey] || 0));
  
  return (
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
                  className="w-full transition-all duration-300 hover:opacity-80 rounded-t"
                  style={{ 
                    height: `${height}%`, 
                    minHeight: '2px',
                    backgroundColor: color 
                  }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  <div className="font-medium">{value.toLocaleString()}</div>
                  <div className="text-muted-foreground">{item[xAxisKey]}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {data.length > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{data[0][xAxisKey]}</span>
          <span>{data[data.length - 1][xAxisKey]}</span>
        </div>
      )}
    </div>
  );
}