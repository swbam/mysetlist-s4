import * as React from "react";
import { cn } from "../../lib/utils";

export interface SetlistSongProps extends React.HTMLAttributes<HTMLDivElement> {
  song: {
    id: string;
    title: string;
    artist: string;
    position?: number;
    votes?: number;
  };
}

const SetlistSong = React.forwardRef<HTMLDivElement, SetlistSongProps>(
  ({ className, song, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card text-card-foreground shadow-sm p-4",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {song.position && (
              <span className="text-sm font-medium text-muted-foreground">
                {song.position}
              </span>
            )}
            <div>
              <h4 className="text-sm font-medium">{song.title}</h4>
              <p className="text-xs text-muted-foreground">{song.artist}</p>
            </div>
          </div>
          {song.votes !== undefined && (
            <span className="text-sm font-medium">{song.votes} votes</span>
          )}
        </div>
      </div>
    );
  },
);
SetlistSong.displayName = "SetlistSong";

export { SetlistSong };
