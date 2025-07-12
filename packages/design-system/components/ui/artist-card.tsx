import React from "react";
import { cn } from "../../lib/utils";

export interface ArtistCardProps extends React.HTMLAttributes<HTMLDivElement> {
  artist: {
    id: string;
    name: string;
    imageUrl?: string | null;
    followers?: number | null;
  };
}

const ArtistCard = React.forwardRef<HTMLDivElement, ArtistCardProps>(
  ({ className, artist, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card text-card-foreground shadow-sm",
          className
        )}
        {...props}
      >
        <div className="p-6">
          <div className="flex items-center space-x-4">
            {artist.imageUrl && (
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="h-12 w-12 rounded-full"
              />
            )}
            <div>
              <h3 className="text-sm font-medium">{artist.name}</h3>
              {artist.followers && (
                <p className="text-xs text-muted-foreground">
                  {artist.followers.toLocaleString()} followers
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
ArtistCard.displayName = "ArtistCard";

export { ArtistCard }; 