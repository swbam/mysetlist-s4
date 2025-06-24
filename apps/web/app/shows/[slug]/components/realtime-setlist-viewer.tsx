'use client';

import { useRealtimeSetlist } from '@/hooks/use-realtime-setlist';
import { Music, Disc3, Star } from 'lucide-react';
import { Card } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@repo/design-system/lib/utils';
import { LiveIndicator } from '@/components/live-indicator';

interface RealtimeSetlistViewerProps {
  showId: string;
  setlistId?: string;
  isLive?: boolean;
  showVotes?: boolean;
}

export function RealtimeSetlistViewer({ 
  showId, 
  setlistId,
  isLive = false,
  showVotes = true
}: RealtimeSetlistViewerProps) {
  const { songs, isLoading } = useRealtimeSetlist({
    setlistId,
    showId,
  });

  if (isLoading && songs.length === 0) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Music className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No songs in the setlist yet</p>
        {isLive && (
          <p className="text-sm text-muted-foreground mt-2">
            Songs will appear here as they're played
          </p>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {isLive && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Live Setlist</h3>
          <LiveIndicator size="sm" />
        </div>
      )}
      
      <AnimatePresence mode="popLayout">
        {songs.map((song, index) => (
          <motion.div
            key={song.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30,
              delay: index * 0.05
            }}
          >
            <Card className={cn(
              "p-4 transition-all duration-200 hover:shadow-md",
              isLive && index === songs.length - 1 && "ring-2 ring-green-500 ring-offset-2"
            )}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                    {song.position}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{song.song?.title || 'Unknown Song'}</h4>
                      {song.is_cover && (
                        <Badge variant="secondary" className="text-xs">
                          <Disc3 className="h-3 w-3 mr-1" />
                          Cover
                        </Badge>
                      )}
                      {song.is_debut && (
                        <Badge variant="default" className="text-xs bg-yellow-500">
                          <Star className="h-3 w-3 mr-1" />
                          Debut
                        </Badge>
                      )}
                    </div>
                    
                    {song.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {song.notes}
                      </p>
                    )}
                    
                    {isLive && index === songs.length - 1 && (
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-green-600 mt-1 font-medium"
                      >
                        Now playing
                      </motion.p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}