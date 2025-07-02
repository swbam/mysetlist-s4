import { db, sql } from '@repo/database';
import { Calendar, Music, Users, TrendingUp } from 'lucide-react';

interface ArtistStatsProps {
  artistId: string;
}

export async function ArtistStats({ artistId }: ArtistStatsProps) {
  // Fetch artist stats (total shows, avg setlist length) via raw SQL
  const statsRes = await db.execute(
    sql`SELECT total_shows, avg_setlist_length
     FROM artist_stats
     WHERE artist_id = ${artistId}
     LIMIT 1`
  ) as unknown as { rows: { total_shows: number | null; avg_setlist_length: number | null }[] };

  const artistStatsData = statsRes.rows[0] ?? { total_shows: 0, avg_setlist_length: null };

  // Fetch follower count
  const followersRes = await db.execute(
    sql`SELECT COUNT(*)::int AS cnt FROM user_follows_artists WHERE artist_id = ${artistId}`
  ) as unknown as { rows: { cnt: number }[] };

  const followerCount = followersRes.rows[0]?.cnt ?? 0;

  // Get total unique songs across all setlists for this artist via raw SQL
  const songCountRes = await db.execute(
    sql`SELECT COUNT(DISTINCT ss.song_id)::int AS cnt
       FROM setlist_songs ss
       JOIN setlists s ON ss.setlist_id = s.id
       WHERE s.artist_id = ${artistId}`
  ) as unknown as { rows: { cnt: number }[] };

  const totalSongs = songCountRes.rows?.[0]?.cnt ?? 0;

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
        <p className="text-2xl font-bold">{artistStatsData.total_shows ?? 0}</p>
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
          {artistStatsData.avg_setlist_length ? 
            Number(artistStatsData.avg_setlist_length).toFixed(1) : 
            '0'
          }
        </p>
      </div>
    </div>
  );
}