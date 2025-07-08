import { artists, db, shows, venues } from '@repo/database';
import { sql } from 'drizzle-orm';

/**
 * Track a view for an artist, show, or venue
 * This should be called when a user views a detail page
 */
export async function trackView(
  type: 'artist' | 'show' | 'venue',
  id: string
): Promise<void> {
  try {
    switch (type) {
      case 'artist':
        // Artists don't have viewCount, but we could track popularity
        await db
          .update(artists)
          .set({
            updatedAt: new Date(),
            // Increment popularity slightly on view
            popularity: sql`LEAST(100, COALESCE(${artists.popularity}, 0) + 0.1)`,
          })
          .where(sql`${artists.id} = ${id}`);
        break;

      case 'show':
        await db
          .update(shows)
          .set({
            viewCount: sql`COALESCE(${shows.viewCount}, 0) + 1`,
            updatedAt: new Date(),
          })
          .where(sql`${shows.id} = ${id}`);
        break;

      case 'venue':
        // Venues don't have viewCount in schema, just update timestamp
        await db
          .update(venues)
          .set({ updatedAt: new Date() })
          .where(sql`${venues.id} = ${id}`);
        break;
    }
  } catch (error) {
    // Don't throw - tracking shouldn't break the app
    console.error(`Failed to track ${type} view:`, error);
  }
}

/**
 * Track attendance for a show
 * This should be called when a user marks themselves as attending
 */
export async function trackAttendance(
  showId: string,
  increment = true
): Promise<void> {
  try {
    await db
      .update(shows)
      .set({
        attendeeCount: increment
          ? sql`COALESCE(${shows.attendeeCount}, 0) + 1`
          : sql`GREATEST(0, COALESCE(${shows.attendeeCount}, 0) - 1)`,
        updatedAt: new Date(),
      })
      .where(sql`${shows.id} = ${showId}`);
  } catch (error) {
    console.error('Failed to track attendance:', error);
  }
}

/**
 * Track a vote on a show
 * This should be called when a user votes on a setlist
 */
export async function trackVote(
  showId: string,
  increment = true
): Promise<void> {
  try {
    await db
      .update(shows)
      .set({
        voteCount: increment
          ? sql`COALESCE(${shows.voteCount}, 0) + 1`
          : sql`GREATEST(0, COALESCE(${shows.voteCount}, 0) - 1)`,
        updatedAt: new Date(),
      })
      .where(sql`${shows.id} = ${showId}`);
  } catch (error) {
    console.error('Failed to track vote:', error);
  }
}

/**
 * Track when a setlist is created for a show
 */
export async function trackSetlistCreated(showId: string): Promise<void> {
  try {
    await db
      .update(shows)
      .set({
        setlistCount: sql`COALESCE(${shows.setlistCount}, 0) + 1`,
        updatedAt: new Date(),
      })
      .where(sql`${shows.id} = ${showId}`);
  } catch (error) {
    console.error('Failed to track setlist creation:', error);
  }
}
