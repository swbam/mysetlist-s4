import { db, sql } from '@repo/database';
import { Calendar, Music, TrendingUp, Users } from 'lucide-react';

interface ArtistStatsProps {
  artistId: string;
}

export async function ArtistStats({ artistId }: ArtistStatsProps) {
  // Fetch artist stats (total shows, avg setlist length) via raw SQL
  const statsRes = (await db.execute(
    sql`SELECT total_shows, avg_setlist_length
     FROM artist_stats
     WHERE artist_id = ${artistId}
     LIMIT 1`
  )) as unknown as {
    rows?: { total_shows: number | null; avg_setlist_length: number | null }[];
  };

  const artistStatsData = statsRes.rows?.[0] ?? {
    total_shows: 0,
    avg_setlist_length: null,
  };

  // Fetch follower count
  const followersRes = (await db.execute(
    sql`SELECT COUNT(*)::int AS cnt FROM user_follows_artists WHERE artist_id = ${artistId}`
  )) as unknown as { rows?: { cnt: number }[] };

  const followerCount = followersRes.rows?.[0]?.cnt ?? 0;

  // Get total unique songs across all setlists for this artist via raw SQL
  const songCountRes = (await db.execute(
    sql`SELECT COUNT(DISTINCT ss.song_id)::int AS cnt
       FROM setlist_songs ss
       JOIN setlists s ON ss.setlist_id = s.id
       WHERE s.artist_id = ${artistId}`
  )) as unknown as { rows?: { cnt: number }[] };

  const totalSongs = songCountRes.rows?.[0]?.cnt ?? 0;

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-sm">Followers</span>
        </div>
        <p className="font-bold text-2xl">{followerCount}</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">Total Shows</span>
        </div>
        <p className="font-bold text-2xl">{artistStatsData.total_shows ?? 0}</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-muted-foreground">
          <Music className="h-4 w-4" />
          <span className="text-sm">Total Songs</span>
        </div>
        <p className="font-bold text-2xl">{totalSongs}</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm">Avg Songs/Show</span>
        </div>
        <p className="font-bold text-2xl">
          {artistStatsData.avg_setlist_length
            ? Number(artistStatsData.avg_setlist_length).toFixed(1)
            : '0'}
        </p>
      </div>
    </div>
  );
}
