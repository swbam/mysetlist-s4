import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Calendar, Music, Users, Vote } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityTimelineProps {
  attendedShows: any[];
  followedArtists: any[];
  votes: any[];
}

export function ActivityTimeline({ attendedShows, followedArtists, votes }: ActivityTimelineProps) {
  // Combine all activities into a single timeline
  const activities = [
    ...attendedShows.map(({ attendance, show, artist, venue }) => ({
      id: `show-${attendance.id}`,
      type: 'show_attended' as const,
      timestamp: attendance.createdAt,
      artist: artist?.name || 'Unknown Artist',
      venue: venue?.name || 'Unknown Venue',
      showName: show.name,
    })),
    ...followedArtists.map(({ follow, artist }) => ({
      id: `follow-${follow.id}`,
      type: 'artist_followed' as const,
      timestamp: follow.createdAt,
      artist: artist.name,
    })),
    ...votes.map(({ vote, song, show }) => ({
      id: `vote-${vote.id}`,
      type: 'vote_cast' as const,
      timestamp: vote.createdAt,
      song: song.title,
      artist: song.artist,
      show: show.name,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'show_attended':
        return <Calendar className="h-4 w-4" />;
      case 'artist_followed':
        return <Users className="h-4 w-4" />;
      case 'vote_cast':
        return <Vote className="h-4 w-4" />;
      default:
        return null;
    }
  };
  
  const getActivityText = (activity: any) => {
    switch (activity.type) {
      case 'show_attended':
        return `Attended ${activity.artist} at ${activity.venue}`;
      case 'artist_followed':
        return `Started following ${activity.artist}`;
      case 'vote_cast':
        return `Voted for "${activity.song}" by ${activity.artist}`;
      default:
        return 'Unknown activity';
    }
  };
  
  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'show_attended':
        return <Badge variant="default">Show</Badge>;
      case 'artist_followed':
        return <Badge variant="secondary">Artist</Badge>;
      case 'vote_cast':
        return <Badge variant="outline">Vote</Badge>;
      default:
        return null;
    }
  };
  
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No recent activity to display.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.slice(0, 10).map((activity) => (
            <div key={activity.id} className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm">{getActivityText(activity)}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(activity.timestamp), 'MMM d, yyyy')}
                  </p>
                  {getActivityBadge(activity.type)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}