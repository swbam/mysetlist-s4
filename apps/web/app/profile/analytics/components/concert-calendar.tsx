import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Calendar } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { useState } from 'react';

interface ConcertCalendarProps {
  attendedShows: any[];
  monthlyShows: Record<string, number>;
}

export function ConcertCalendar({ attendedShows, monthlyShows }: ConcertCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const showsByDate = attendedShows.reduce((acc, show) => {
    const date = format(parseISO(show.shows?.date || show.created_at), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(show);
    return acc;
  }, {} as Record<string, any[]>);
  
  const monthKey = format(currentMonth, 'yyyy-MM');
  const showsThisMonth = monthlyShows[monthKey] || 0;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Concert Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-1 hover:bg-accent rounded"
            >
              ←
            </button>
            <span className="text-sm font-medium">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-1 hover:bg-accent rounded"
            >
              →
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Shows this month
            </p>
            <Badge variant="secondary">{showsThisMonth}</Badge>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: days[0].getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            
            {days.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayShows = showsByDate[dateKey] || [];
              const hasShows = dayShows.length > 0;
              
              return (
                <div
                  key={day.toISOString()}
                  className={`
                    relative p-2 text-center text-sm rounded-md
                    ${hasShows ? 'bg-primary/10 font-medium' : 'hover:bg-accent'}
                    ${!isSameMonth(day, currentMonth) ? 'text-muted-foreground' : ''}
                  `}
                >
                  <div>{format(day, 'd')}</div>
                  {hasShows && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                      <div className="flex gap-0.5">
                        {dayShows.slice(0, 3).map((_show: any, i: number) => (
                          <div
                            key={i}
                            className="w-1 h-1 bg-primary rounded-full"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {Object.keys(showsByDate).length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Shows this month:</p>
              {days
                .filter(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  return showsByDate[dateKey]?.length > 0;
                })
                .map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayShows = showsByDate[dateKey];
                  
                  return (
                    <div key={dateKey} className="text-sm space-y-1">
                      <p className="font-medium">{format(day, 'MMM d')}</p>
                      {dayShows.map((show: any) => (
                        <p key={show.id} className="text-muted-foreground pl-4">
                          {show.shows?.artists?.name} at {show.shows?.venues?.name}
                        </p>
                      ))}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}