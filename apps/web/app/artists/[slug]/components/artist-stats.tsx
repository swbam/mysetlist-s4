import { db, artistStats, userFollowsArtists } from '@repo/database';
import { eq, count, sql } from 'drizzle-orm';
import { Calendar, Music, Users, TrendingUp } from 'lucide-react';

interface ArtistStatsProps {
  artistId: string;
}

export async function ArtistStats({ artistId }: ArtistStatsProps) {
  // Get stats from the artistStats table
  const stats = await db
    .select()
    .from(artistStats)
    .where(eq(artistStats.artistId, artistId))
    .limit(1);

  const artistStatsData = stats[0];

  // Get follower count
  const followerResult = await db
    .select({ count: count() })
    .from(userFollowsArtists)
    .where(eq(userFollowsArtists.artistId, artistId));

  const followerCount = followerResult[0]?.count || 0;

  // Get total unique songs across all setlists for this artist via raw SQL to avoid cross-version type issues
  // @ts-ignore drizzle dual-version type mismatch
  const songCountRes = await db.execute(
    sql`SELECT COUNT(DISTINCT ss.song_id)::int AS count
        FROM setlist_songs ss
        JOIN setlists s ON ss.setlist_id = s.id
        WHERE s.artist_id = ${artistId}`
  ) as unknown as { rows: { count: number }[] };

  const totalSongs = songCountRes.rows?.[0]?.count ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-card rounded-lg p-4 border">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Users className="h-4 w-4" />
          <span className="text-sm">Followers</span>
        </div>
        <p className="text-2xl font-bold">{followerCount}</p>
      </div>

      <div className="bg-card rounded-lg p-4 border">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">Total Shows</span>
        </div>
        <p className="text-2xl font-bold">{artistStatsData?.totalShows || 0}</p>
      </div>

      <div className="bg-card rounded-lg p-4 border">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Music className="h-4 w-4" />
          <span className="text-sm">Total Songs</span>
        </div>
        <p className="text-2xl font-bold">{totalSongs}</p>
      </div>

      <div className="bg-card rounded-lg p-4 border">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm">Avg Songs/Show</span>
        </div>
        <p className="text-2xl font-bold">
          {artistStatsData?.avgSetlistLength ? 
            Number(artistStatsData.avgSetlistLength).toFixed(1) : 
            '0'
          }
        </p>
      </div>
    </div>
  );
}