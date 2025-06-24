'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { 
  ChevronUp, 
  ChevronDown, 
  Clock, 
  Music, 
  Play, 
  Users,
  Lock,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../../../providers/auth-provider';
import { cn } from '@repo/design-system/lib/utils';

interface SetlistSong {
  id: string;
  position: number;
  notes?: string;
  isPlayed?: boolean;
  playTime?: string;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  song: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    albumArtUrl?: string;
    durationMs?: number;
    previewUrl?: string;
    isExplicit: boolean;
  };
}

interface Setlist {
  id: string;
  name: string;
  type: 'predicted' | 'actual';
  orderIndex: number;
  isLocked: boolean;
  totalVotes: number;
  accuracyScore: number;
  songs: SetlistSong[];
  artist: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

interface SetlistViewerProps {
  setlists: Setlist[];
  showId: string;
  isLive?: boolean;
}

export function SetlistViewer({ setlists, showId, isLive = false }: SetlistViewerProps) {
  const { user } = useAuth();
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down' | null>>({});
  const [votingStates, setVotingStates] = useState<Record<string, boolean>>({});

  // Load user's existing votes
  useEffect(() => {
    if (user && setlists.length > 0) {
      loadUserVotes();
    }
  }, [user, setlists]);

  const loadUserVotes = async () => {
    try {
      const allSongs = setlists.flatMap(setlist => setlist.songs);
      const votes: Record<string, 'up' | 'down' | null> = {};
      
      for (const song of allSongs) {
        const response = await fetch(`/api/votes?setlistSongId=${song.id}`);
        if (response.ok) {
          const data = await response.json();
          votes[song.id] = data.userVote;
        }
      }
      
      setUserVotes(votes);
    } catch (error) {
      console.error('Failed to load user votes:', error);
    }
  };

  const handleVote = async (songId: string, voteType: 'up' | 'down' | null) => {
    if (!user) return;

    setVotingStates(prev => ({ ...prev, [songId]: true }));

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setlistSongId: songId,
          voteType: userVotes[songId] === voteType ? null : voteType,
        }),
      });

      if (!response.ok) throw new Error('Vote failed');

      const data = await response.json();
      
      // Update local state
      setUserVotes(prev => ({
        ...prev,
        [songId]: data.voteType,
      }));

      // Update setlists with new vote counts
      setlists.forEach(setlist => {
        const song = setlist.songs.find(s => s.id === songId);
        if (song) {
          song.upvotes = data.upvotes;
          song.downvotes = data.downvotes;
          song.netVotes = data.netVotes;
        }
      });

    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setVotingStates(prev => ({ ...prev, [songId]: false }));
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const VoteButton = ({ song, type }: { song: SetlistSong; type: 'up' | 'down' }) => {
    const isActive = userVotes[song.id] === type;
    const count = type === 'up' ? song.upvotes : song.downvotes;
    const isVoting = votingStates[song.id];
    const Icon = type === 'up' ? ChevronUp : ChevronDown;

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote(song.id, type)}
        disabled={isVoting || !user}
        className={cn(
          'h-8 w-8 p-0 transition-colors',
          isActive && type === 'up' && 'bg-green-100 text-green-700 hover:bg-green-200',
          isActive && type === 'down' && 'bg-red-100 text-red-700 hover:bg-red-200'
        )}
      >
        <Icon className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      {setlists.map((setlist) => (
        <Card key={setlist.id} className={cn(
          'transition-all duration-200',
          setlist.type === 'actual' && 'ring-2 ring-green-200 dark:ring-green-800'
        )}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={setlist.artist.imageUrl} alt={setlist.artist.name} />
                  <AvatarFallback>
                    <Music className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {setlist.name}
                    <Badge variant={setlist.type === 'actual' ? 'default' : 'secondary'}>
                      {setlist.type === 'actual' ? 'Confirmed' : 'Predicted'}
                    </Badge>
                    {isLive && setlist.type === 'actual' && (
                      <Badge variant="destructive" className="animate-pulse">
                        LIVE
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {setlist.artist.name} • {setlist.songs.length} songs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {setlist.isLocked && (
                  <div className="flex items-center gap-1">
                    <Lock className="h-4 w-4" />
                    Locked
                  </div>
                )}
                {setlist.type === 'predicted' && (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {setlist.totalVotes} votes
                  </div>
                )}
                {setlist.accuracyScore > 0 && (
                  <div className="flex items-center gap-1">
                    <Check className="h-4 w-4 text-green-500" />
                    {setlist.accuracyScore}% accurate
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              {setlist.songs.map((song) => (
                <div
                  key={song.id}
                  className={cn(
                    'flex items-center gap-4 p-3 rounded-lg border transition-all duration-200',
                    song.isPlayed && setlist.type === 'actual' 
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                      : 'bg-card hover:bg-muted/50'
                  )}
                >
                  {/* Position */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    song.isPlayed 
                      ? 'bg-green-500 text-white' 
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {song.isPlayed ? <Check className="h-4 w-4" /> : song.position}
                  </div>

                  {/* Album Art */}
                  {song.song.albumArtUrl && (
                    <Avatar className="h-10 w-10 rounded">
                      <AvatarImage src={song.song.albumArtUrl} alt={song.song.album} />
                      <AvatarFallback>
                        <Music className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{song.song.title}</h4>
                      {song.song.isExplicit && (
                        <Badge variant="outline" className="text-xs">E</Badge>
                      )}
                      {song.notes && (
                        <Badge variant="outline" className="text-xs">
                          {song.notes}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{song.song.artist}</span>
                      {song.song.album && <span>• {song.song.album}</span>}
                      {song.song.durationMs && (
                        <>
                          <Clock className="h-3 w-3" />
                          {formatDuration(song.song.durationMs)}
                        </>
                      )}
                      {song.playTime && (
                        <span className="text-green-600">
                          Played at {new Date(song.playTime).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {song.song.previewUrl && (
                      <Button variant="ghost" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Voting (only for predicted setlists) */}
                    {user && setlist.type === 'predicted' && !setlist.isLocked && (
                      <div className="flex items-center gap-1">
                        <VoteButton song={song} type="up" />
                        <span className={cn(
                          'text-sm font-medium min-w-[2rem] text-center',
                          song.netVotes > 0 && 'text-green-600',
                          song.netVotes < 0 && 'text-red-600',
                          song.netVotes === 0 && 'text-muted-foreground'
                        )}>
                          {song.netVotes > 0 ? `+${song.netVotes}` : song.netVotes}
                        </span>
                        <VoteButton song={song} type="down" />
                      </div>
                    )}

                    {/* Total votes display */}
                    {setlist.type === 'predicted' && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {song.upvotes + song.downvotes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {setlist.songs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-8 w-8 mx-auto mb-2" />
                <p>No songs in this setlist yet</p>
                {setlist.type === 'predicted' && (
                  <p className="text-sm">Be the first to contribute!</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {setlists.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No setlists available</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to create a predicted setlist for this show!
            </p>
            {user && (
              <Button>
                <Music className="h-4 w-4 mr-2" />
                Create Setlist
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 