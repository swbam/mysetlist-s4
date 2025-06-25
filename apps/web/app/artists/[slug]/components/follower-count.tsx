import { db, userFollowsArtists } from '@repo/database';
import { eq, count } from 'drizzle-orm';

interface FollowerCountProps {
  artistId: string;
}

export async function FollowerCount({ artistId }: FollowerCountProps) {
  const result = await db
    .select({ count: count() })
    .from(userFollowsArtists)
    .where(eq(userFollowsArtists.artistId, artistId));

  const followerCount = result[0]?.count || 0;

  return (
    <span className="text-sm text-muted-foreground">
      {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
    </span>
  );
}