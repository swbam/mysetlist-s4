'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { FileText, Image, MessageSquare, Music, MapPin, Users } from 'lucide-react';
import { Progress } from '@repo/design-system/components/ui/progress';

interface ContentMetricsProps {
  stats: {
    totalShows: number;
    totalArtists: number;
    totalVenues: number;
    totalSetlists: number;
    totalVotes: number;
    totalFollows: number;
  };
}

export default function ContentMetrics({ stats }: ContentMetricsProps) {
  const contentTypes = [
    {
      name: 'Shows',
      icon: Music,
      total: stats.totalShows,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500'
    },
    {
      name: 'Artists',
      icon: Users,
      total: stats.totalArtists,
      color: 'text-green-500',
      bgColor: 'bg-green-500'
    },
    {
      name: 'Venues',
      icon: MapPin,
      total: stats.totalVenues,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500'
    },
    {
      name: 'Setlists',
      icon: FileText,
      total: stats.totalSetlists,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500'
    }
  ];

  const totalContent = stats.totalShows + stats.totalArtists + stats.totalVenues + stats.totalSetlists;
  
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
                Total in database
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Content Distribution</CardTitle>
            <CardDescription>Breakdown by content type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contentTypes.map((type) => {
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
                        className={`h-2 rounded-full ${type.bgColor}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
            <CardDescription>User-generated content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Total Votes</span>
                <span className="font-medium">{stats.totalVotes.toLocaleString()}</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Artist Follows</span>
                <span className="font-medium">{stats.totalFollows.toLocaleString()}</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Setlists Created</span>
                <span className="font-medium">{stats.totalSetlists.toLocaleString()}</span>
              </div>
              <Progress value={40} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Content Summary</CardTitle>
          <CardDescription>Overall platform content statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Avg. Shows per Artist</p>
              <p className="text-2xl font-bold">
                {stats.totalArtists > 0 ? (stats.totalShows / stats.totalArtists).toFixed(1) : '0'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg. Shows per Venue</p>
              <p className="text-2xl font-bold">
                {stats.totalVenues > 0 ? (stats.totalShows / stats.totalVenues).toFixed(1) : '0'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg. Votes per Show</p>
              <p className="text-2xl font-bold">
                {stats.totalShows > 0 ? (stats.totalVotes / stats.totalShows).toFixed(1) : '0'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}