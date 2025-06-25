'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, UserCheck, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@repo/design-system/components/ui/tooltip';
import { AttendanceTracker } from './attendance-tracker';
import { formatDistanceToNow } from 'date-fns';

type AttendeeListProps = {
  showId: string;
  currentUser?: any;
};

interface Attendee {
  id: string;
  user: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  attending_since: string;
}

export function AttendeeList({ showId, currentUser }: AttendeeListProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchAttendees();
  }, [showId]);

  const fetchAttendees = async () => {
    try {
      const response = await fetch(`/api/attendance?showId=${showId}`);
      if (response.ok) {
        const data = await response.json();
        setAttendees(data.attendees || []);
        setTotalAttendees(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch attendees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const displayedAttendees = showAll ? attendees : attendees.slice(0, 8);
  const hasMore = attendees.length > 8;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1">
                  <div className="w-24 h-4 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendees
            {totalAttendees > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({totalAttendees})
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Attendance Tracker */}
        <AttendanceTracker 
          showId={showId}
          initialCount={totalAttendees}
          onAttendanceChange={fetchAttendees}
        />

        {/* Attendees List */}
        {displayedAttendees.length > 0 ? (
          <div className="space-y-3">
            <TooltipProvider>
              {displayedAttendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={attendee.user.avatar_url} 
                          alt={attendee.user.display_name}
                        />
                        <AvatarFallback>
                          {attendee.user.display_name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <p className="font-medium">{attendee.user.display_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Going since {formatDistanceToNow(new Date(attendee.attending_since))} ago
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attendee.user.display_name}
                      {attendee.user.id === currentUser?.id && (
                        <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                      )}
                    </p>
                  </div>
                  
                  <UserCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                </div>
              ))}
            </TooltipProvider>

            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="w-full"
              >
                {showAll ? 'Show Less' : `Show ${attendees.length - 8} More`}
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No one is attending yet</p>
            <p className="text-xs">Be the first to mark yourself as going!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}