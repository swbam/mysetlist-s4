'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Progress } from '@repo/design-system/components/ui/progress';
import { ThumbsUp, Clock, Music, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

type SetlistViewerProps = {
  showId: string;
};

type Song = {
  id: number;
  title: string;
  duration: string;
  votes: number;
  isPlaying?: boolean;
  isPlayed?: boolean;
  isSurprise?: boolean;
};

// Mock data - in real app this would come from the database with real-time updates
const mockSetlist: Song[] = [
  { id: 1, title: 'Cruel Summer', duration: '2:58', votes: 2450, isPlayed: true },
  { id: 2, title: 'Lover', duration: '3:41', votes: 2180, isPlayed: true },
  { id: 3, title: 'The Man', duration: '3:10', votes: 1920, isPlayed: true },
  { id: 4, title: 'Love Story', duration: '3:56', votes: 3100, isPlaying: true },
  { id: 5, title: 'You Belong With Me', duration: '3:51', votes: 0 },
  { id: 6, title: 'Blank Space', duration: '3:51', votes: 0 },
  { id: 7, title: 'Shake It Off', duration: '3:39', votes: 0 },
  { id: 8, title: 'All Too Well (10 Minute Version)', duration: '10:13', votes: 0 },
];

export const SetlistViewer = ({ showId }: SetlistViewerProps) => {
  const [songs, setSongs] = useState(mockSetlist);
  const [userVotes, setUserVotes] = useState<number[]>([]);
  const currentSongIndex = songs.findIndex(song => song.isPlaying);
  const playedSongs = songs.filter(song => song.isPlayed).length;
  const progress = (playedSongs / songs.length) * 100;

  const handleVote = (songId: number) => {
    if (userVotes.includes(songId)) return;
    
    setUserVotes([...userVotes, songId]);
    setSongs(songs.map(song => 
      song.id === songId 
        ? { ...song, votes: song.votes + 1 }
        : song
    ));
  };

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSongs(prev => prev.map(song => {
        if (song.isPlayed && song.votes > 0) {
          return { ...song, votes: song.votes + Math.floor(Math.random() * 5) };
        }
        return song;
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Live Setlist
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {playedSongs} of {songs.length} songs
          </Badge>
        </div>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {songs.map((song, index) => (
            <div 
              key={song.id} 
              className={`p-4 transition-colors ${
                song.isPlaying ? 'bg-primary/5 border-l-4 border-primary' : ''
              } ${song.isPlayed && !song.isPlaying ? 'opacity-75' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-muted-foreground w-8">
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{song.title}</h3>
                      {song.isPlaying && (
                        <Badge variant="destructive" className="animate-pulse">
                          NOW PLAYING
                        </Badge>
                      )}
                      {song.isSurprise && (
                        <Badge variant="secondary" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          Surprise!
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{song.duration}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {song.votes > 0 && (
                    <div className="text-right">
                      <p className="font-semibold">{song.votes.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">votes</p>
                    </div>
                  )}
                  <Button
                    variant={userVotes.includes(song.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleVote(song.id)}
                    disabled={!song.isPlayed || userVotes.includes(song.id)}
                    className="gap-2"
                  >
                    <ThumbsUp className={`h-4 w-4 ${userVotes.includes(song.id) ? 'fill-current' : ''}`} />
                    {userVotes.includes(song.id) ? 'Voted' : 'Vote'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};