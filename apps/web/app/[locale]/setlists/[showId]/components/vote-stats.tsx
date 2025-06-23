'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Progress } from '@repo/design-system/components/ui/progress';
import { TrendingUp, Users, Heart, MessageCircle } from 'lucide-react';

type VoteStatsProps = {
  showId: string;
};

// Mock data - in real app this would come from real-time database
const topVotedSongs = [
  { title: 'Love Story', votes: 3100, percentage: 95 },
  { title: 'Cruel Summer', votes: 2450, percentage: 88 },
  { title: 'Lover', votes: 2180, percentage: 82 },
  { title: 'The Man', votes: 1920, percentage: 75 },
  { title: 'Anti-Hero', votes: 1850, percentage: 72 },
];

export const VoteStats = ({ showId }: VoteStatsProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Voted Songs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {topVotedSongs.map((song, index) => (
            <div key={song.title} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{index + 1}</span>
                  <span className="text-sm font-medium">{song.title}</span>
                </div>
                <Badge variant="secondary">{song.votes}</Badge>
              </div>
              <Progress value={song.percentage} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Live Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Active Voters</span>
            </div>
            <span className="font-semibold">8,421</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Total Votes</span>
            </div>
            <span className="font-semibold">24,580</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Comments</span>
            </div>
            <span className="font-semibold">1,892</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6 text-center">
          <h3 className="font-semibold mb-2">Join the conversation!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Vote for your favorite songs and see what other fans are loving
          </p>
          <Badge variant="secondary" className="animate-pulse">
            🔴 Voting is LIVE
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
};