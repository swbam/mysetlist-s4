"use client";

import { Card } from "@repo/design-system/components/ui/card";
import { cn } from "@repo/design-system/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Music } from "lucide-react";
import { LiveIndicator } from "~/components/live-indicator";
import { useRealtimeSetlist } from "~/hooks/use-realtime-setlist";

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
  showVotes: _showVotes = true,
}: RealtimeSetlistViewerProps) {
  const { setlists, loading } = useRealtimeSetlist({
    showId,
  });

  const currentSetlist = setlists.find((s) => s.id === setlistId);
  const songs = currentSetlist?.songs || [];

  if (loading && songs.length === 0) {
    return (
      <div className="space-y-2">
        {[...new Array(5)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Music className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No songs in the setlist yet</p>
        {isLive && (
          <p className="mt-2 text-muted-foreground text-sm">
            Songs will appear here as they're played
          </p>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {isLive && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Live Setlist</h3>
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
              delay: index * 0.05,
            }}
          >
            <Card
              className={cn(
                "p-4 transition-all duration-200 hover:shadow-md",
                isLive &&
                  index === songs.length - 1 &&
                  "ring-2 ring-green-500 ring-offset-2",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-1 items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
                    {song.position}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {song.song?.title || "Unknown Song"}
                      </h4>
                    </div>

                    {song.notes && (
                      <p className="mt-1 text-muted-foreground text-sm">
                        {song.notes}
                      </p>
                    )}

                    {isLive && index === songs.length - 1 && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-1 font-medium text-green-600 text-sm"
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
