import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Calendar, Music, Users, Vote } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Activity {
  id: string;
  type: 'show_attended' | 'artist_followed' | 'vote_cast' | 'setlist_created';
  timestamp: string;
  details: any;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'show_attended':
        return <Calendar className="h-4 w-4" />;
      case 'artist_followed':
        return <Users className="h-4 w-4" />;
      case 'vote_cast':
        return <Vote className="h-4 w-4" />;
      case 'setlist_created':
        return <Music className="h-4 w-4" />;
      default:
        return null;
    }
  };
  
  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case 'show_attended':
        return `Attended ${activity.details.artist_name} at ${activity.details.venue_name}`;
      case 'artist_followed':
        return `Started following ${activity.details.artist_name}`;
      case 'vote_cast':
        return `Voted for "${activity.details.song_name}" at ${activity.details.show_name}`;
      case 'setlist_created':
        return `Created setlist for ${activity.details.show_name}`;
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
      case 'setlist_created':
        return <Badge>Setlist</Badge>;
      default:
        return null;
    }
  };
  
  if (!activities || activities.length === 0) {
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
                    {format(parseISO(activity.timestamp), 'MMM d, yyyy')}
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