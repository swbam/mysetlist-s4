'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { Progress } from '@repo/design-system/components/ui/progress';
import { Calendar, Music, TrendingUp, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { useMemo } from 'react';
import { StatCard } from './stat-card';
import { ActivityTimeline } from './activity-timeline';
import { MusicTasteAnalysis } from './music-taste-analysis';
import { ConcertCalendar } from './concert-calendar';

interface UserAnalyticsDashboardProps {
  stats: {
    showsAttended: number;
    artistsFollowed: number;
    votesCast: number;
    memberSince: Date;
    concertCount: number;
  };
  attendedShows: any[];
  followedArtists: any[];
  votes: any[];
  topGenres: { genre: string; count: number }[];
  attendanceByMonth: { month: string; count: number }[];
}

export function UserAnalyticsDashboard({
  stats,
  attendedShows,
  followedArtists,
  votes,
  topGenres,
  attendanceByMonth,
}: UserAnalyticsDashboardProps) {
  // Calculate music taste metrics
  const musicTaste = useMemo(() => {
    const venueCount: Record<string, number> = {};
    const monthlyShows: Record<string, number> = {};
    
    attendedShows.forEach(({ show, venue }) => {
      // Count venues
      if (venue?.name) {
        venueCount[venue.name] = (venueCount[venue.name] || 0) + 1;
      }
      
      // Count shows by month
      const month = format(new Date(show.date), 'yyyy-MM');
      monthlyShows[month] = (monthlyShows[month] || 0) + 1;
    });
    
    const topVenues = Object.entries(venueCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    // Convert attendanceByMonth to object for backward compatibility
    attendanceByMonth.forEach(({ month, count }) => {
      monthlyShows[month] = count;
    });
    
    return { topVenues, monthlyShows };
  }, [attendedShows, attendanceByMonth]);
  
  // Calculate engagement score
  const engagementScore = useMemo(() => {
    const baseScore = (stats.showsAttended * 10) + (stats.artistsFollowed * 5) + (stats.votesCast * 2);
    return Math.min(100, Math.round(baseScore / 10));
  }, [stats]);
  
  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Shows Attended"
          value={stats.showsAttended}
          icon={<Calendar className="h-4 w-4" />}
          description="Total concerts"
        />
        <StatCard
          title="Artists Followed"
          value={stats.artistsFollowed}
          icon={<Users className="h-4 w-4" />}
          description="In your collection"
        />
        <StatCard
          title="Votes Cast"
          value={stats.votesCast}
          icon={<Music className="h-4 w-4" />}
          description="Song preferences"
        />
        <StatCard
          title="Engagement Score"
          value={`${engagementScore}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Community participation"
        />
      </div>
      
      {/* Engagement Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Your Music Journey</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Engagement</span>
                <span>{engagementScore}%</span>
              </div>
              <Progress value={engagementScore} className="h-2" />
            </div>
            <p className="text-sm text-muted-foreground">
              Member since {format(stats.memberSince, 'MMMM yyyy')}
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">Activity</TabsTrigger>
          <TabsTrigger value="taste">Music Taste</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline" className="space-y-4">
          <ActivityTimeline 
            attendedShows={attendedShows}
            followedArtists={followedArtists}
            votes={votes}
          />
        </TabsContent>
        
        <TabsContent value="taste" className="space-y-4">
          <MusicTasteAnalysis
            topGenres={topGenres}
            topVenues={musicTaste.topVenues}
            followedArtists={followedArtists}
          />
        </TabsContent>
        
        <TabsContent value="calendar" className="space-y-4">
          <ConcertCalendar
            attendedShows={attendedShows}
            monthlyShows={musicTaste.monthlyShows}
          />
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Show Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Average shows/month</dt>
                    <dd className="text-sm font-medium">
                      {(stats.showsAttended / 12).toFixed(1)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Most active month</dt>
                    <dd className="text-sm font-medium">
                      {Object.entries(musicTaste.monthlyShows)
                        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Unique venues</dt>
                    <dd className="text-sm font-medium">
                      {new Set(attendedShows.map(s => s.venue?.id).filter(Boolean)).size}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Voting Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Total votes</dt>
                    <dd className="text-sm font-medium">{stats.votesCast}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Average votes/show</dt>
                    <dd className="text-sm font-medium">
                      {stats.showsAttended > 0 
                        ? (stats.votesCast / stats.showsAttended).toFixed(1)
                        : '0'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Participation rate</dt>
                    <dd className="text-sm font-medium">
                      {stats.showsAttended > 0 
                        ? `${Math.round((votes.length / stats.showsAttended) * 100)}%`
                        : '0%'}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}