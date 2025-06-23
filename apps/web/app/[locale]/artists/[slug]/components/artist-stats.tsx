import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Calendar, Music2, Mic2, TrendingUp } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ArtistStatsProps {
  stats: {
    totalShows: number | null;
    totalSetlists: number | null;
    avgSetlistLength: number | null;
    mostPlayedSong: string | null;
    lastShowDate: string | null;
  } | null;
}

export function ArtistStats({ stats }: ArtistStatsProps) {
  if (!stats) {
    return null;
  }

  const statItems = [
    {
      label: 'Total Shows',
      value: stats.totalShows || 0,
      icon: Calendar,
    },
    {
      label: 'Total Setlists',
      value: stats.totalSetlists || 0,
      icon: Music2,
    },
    {
      label: 'Avg Songs/Show',
      value: stats.avgSetlistLength ? Math.round(stats.avgSetlistLength) : 'N/A',
      icon: Mic2,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
              <span className="font-semibold">{item.value}</span>
            </div>
          ))}

          {stats.mostPlayedSong && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Most Played Song</p>
              <p className="font-medium">{stats.mostPlayedSong}</p>
            </div>
          )}

          {stats.lastShowDate && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Last Show</p>
              <p className="font-medium">{formatDate(stats.lastShowDate)}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}