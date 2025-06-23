import { db } from '@repo/database';
import { artists } from '@repo/database/src/schema';
import { desc, eq } from 'drizzle-orm';
import { ArtistCard } from './artist-card';

export async function ArtistGridServer() {
  
  // Fetch top artists
  const topArtists = await db
    .select()
    .from(artists)
    .where(eq(artists.verified, true))
    .orderBy(desc(artists.popularity))
    .limit(12);

  if (topArtists.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No artists found. Check back later!</p>
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
}