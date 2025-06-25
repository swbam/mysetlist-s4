'use client';

import { TrendingUp, TrendingDown, Users, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Progress } from '@repo/design-system/components/ui/progress';
import { cn } from '@repo/design-system/lib/utils';

interface VoteSummaryProps {
  totalVotes: number;
  totalUpvotes: number;
  totalDownvotes: number;
  topSongs?: Array<{
    id: string;
    title: string;
    artist: string;
    netVotes: number;
    upvotes: number;
    downvotes: number;
  }>;
  className?: string;
}

export function VoteSummary({
  totalVotes,
  totalUpvotes,
  totalDownvotes,
  topSongs = [],
  className,
}: VoteSummaryProps) {
  const netVotes = totalUpvotes - totalDownvotes;
  const upvotePercentage = totalVotes > 0 ? (totalUpvotes / totalVotes) * 100 : 0;
  const downvotePercentage = totalVotes > 0 ? (totalDownvotes / totalVotes) * 100 : 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          Voting Summary
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-lg font-bold">
              <Users className="h-4 w-4 text-muted-foreground" />
              {totalVotes}
            </div>
            <p className="text-xs text-muted-foreground">Total Votes</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-lg font-bold text-green-600">
              <TrendingUp className="h-4 w-4" />
              {totalUpvotes}
            </div>
            <p className="text-xs text-muted-foreground">Upvotes</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-lg font-bold text-red-600">
              <TrendingDown className="h-4 w-4" />
              {totalDownvotes}
            </div>
            <p className="text-xs text-muted-foreground">Downvotes</p>
          </div>
        </div>

        {/* Vote Distribution */}
        {totalVotes > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Upvotes ({upvotePercentage.toFixed(1)}%)</span>
              <span className="text-red-600">Downvotes ({downvotePercentage.toFixed(1)}%)</span>
            </div>
            <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
              <div 
                className="bg-green-500 transition-all"
                style={{ width: `${upvotePercentage}%` }}
              />
              <div 
                className="bg-red-500 transition-all"
                style={{ width: `${downvotePercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Net Sentiment */}
        <div className="text-center p-3 rounded-lg border">
          <div className={cn(
            "text-2xl font-bold",
            netVotes > 0 && "text-green-600",
            netVotes < 0 && "text-red-600",
            netVotes === 0 && "text-muted-foreground"
          )}>
            {netVotes > 0 ? '+' : ''}{netVotes}
          </div>
          <p className="text-sm text-muted-foreground">Net Vote Score</p>
        </div>

        {/* Top Songs */}
        {topSongs.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Most Voted Songs</h4>
            <div className="space-y-2">
              {topSongs.slice(0, 3).map((song, index) => (
                <div key={song.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <div className="truncate">
                      <span className="font-medium">{song.title}</span>
                      <span className="text-muted-foreground"> • {song.artist}</span>
                    </div>
                  </div>
                  <Badge 
                    variant={song.netVotes > 0 ? "default" : song.netVotes < 0 ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {song.netVotes > 0 ? '+' : ''}{song.netVotes}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {totalVotes === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No votes yet</p>
            <p className="text-xs">Votes will appear here as fans participate</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}