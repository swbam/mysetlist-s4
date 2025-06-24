import { db } from '@repo/database';
import { artists } from '@repo/database/src/schema';
import { desc, eq } from 'drizzle-orm';
import { ArtistCard } from './artist-card';

export async function ArtistGridServer() {
  
  try {
    // Fetch top artists using the same query pattern as the search API
    const topArtists = await db.query.artists.findMany({
      orderBy: [desc(artists.popularity)],
      limit: 12,
    });

    if (topArtists.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No artists found. Use the search above to discover new artists!</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {topArtists.map((artist) => (
          <ArtistCard key={artist.id} artist={{
            ...artist,
            verified: artist.verified ?? false
          }} />
        ))}
      </div>
    );
  } catch (error) {
    console.error('Error fetching artists:', error);
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No artists found. Use the search above to discover new artists!</p>
        <p className="text-xs text-muted-foreground mt-2">Try searching for artists like "Dave Matthews Band" to add them to your database.</p>
      </div>
    );
  }
}