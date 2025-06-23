import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Progress } from '@repo/design-system/components/ui/progress';

interface MusicTasteAnalysisProps {
  topGenres: [string, number][];
  topVenues: [string, number][];
  followedArtists: any[];
}

export function MusicTasteAnalysis({ topGenres, topVenues, followedArtists }: MusicTasteAnalysisProps) {
  const maxGenreCount = topGenres[0]?.[1] || 1;
  const maxVenueCount = topVenues[0]?.[1] || 1;
  
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Top Genres</CardTitle>
        </CardHeader>
        <CardContent>
          {topGenres.length > 0 ? (
            <div className="space-y-4">
              {topGenres.map(([genre, count]) => (
                <div key={genre} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{genre}</span>
                    <span className="text-sm text-muted-foreground">{count} shows</span>
                  </div>
                  <Progress value={(count / maxGenreCount) * 100} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No genre data available yet.</p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Favorite Venues</CardTitle>
        </CardHeader>
        <CardContent>
          {topVenues.length > 0 ? (
            <div className="space-y-4">
              {topVenues.map(([venue, count]) => (
                <div key={venue} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium line-clamp-1">{venue}</span>
                    <span className="text-sm text-muted-foreground">{count} visits</span>
                  </div>
                  <Progress value={(count / maxVenueCount) * 100} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No venue data available yet.</p>
          )}
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Your Artists Collection</CardTitle>
        </CardHeader>
        <CardContent>
          {followedArtists.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {followedArtists.slice(0, 20).map((item) => (
                <Badge key={item.artist_id} variant="secondary">
                  {item.artists?.name}
                </Badge>
              ))}
              {followedArtists.length > 20 && (
                <Badge variant="outline">+{followedArtists.length - 20} more</Badge>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Start following artists to see them here.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}