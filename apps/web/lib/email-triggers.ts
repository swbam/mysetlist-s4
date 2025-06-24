import { db } from '@repo/database';
import { 
  users, 
  userFollowsArtists, 
  shows, 
  artists, 
  emailPreferences 
} from '@repo/database/src/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { 
  sendWelcomeEmailAction,
  queueEmail 
} from '../app/actions/email-notifications';

// Trigger welcome email when user signs up
export async function triggerWelcomeEmail(userId: string) {
  try {
    await sendWelcomeEmailAction(userId);
    console.log(`Welcome email sent to user ${userId}`);
  } catch (error) {
    console.error(`Failed to send welcome email to user ${userId}:`, error);
  }
}

// Trigger new show notifications when a show is created
export async function triggerNewShowNotifications(showId: string) {
  try {
    // Get show details
    const showData = await db
      .select({
        id: shows.id,
        name: shows.name,
        venueId: shows.venueId,
        date: shows.date,
        startTime: shows.startTime,
        ticketUrl: shows.ticketUrl,
        artistId: shows.headlinerArtistId,
        artistName: artists.name,
      })
      .from(shows)
      .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .where(eq(shows.id, showId))
      .limit(1);

    if (showData.length === 0) {
      console.error(`Show ${showId} not found`);
      return;
    }

    const show = showData[0];

    // Get users who follow this artist and want new show notifications
    const followersWithPreferences = await db
      .select({
        userId: users.id,
        userEmail: users.email,
        userName: users.displayName,
        frequency: emailPreferences.newShowFrequency,
      })
      .from(userFollowsArtists)
      .innerJoin(users, eq(userFollowsArtists.userId, users.id))
      .innerJoin(emailPreferences, eq(users.id, emailPreferences.userId))
      .where(
        and(
          eq(userFollowsArtists.artistId, show.artistId),
          eq(emailPreferences.emailEnabled, true),
          eq(emailPreferences.newShowNotifications, true)
        )
      );

    if (followersWithPreferences.length === 0) {
      console.log(`No followers found for artist ${show.artistName} with new show notifications enabled`);
      return;
    }

    // Group users by their notification frequency
    const immediateUsers = followersWithPreferences.filter(u => u.frequency === 'immediately');
    const dailyUsers = followersWithPreferences.filter(u => u.frequency === 'daily');
    const weeklyUsers = followersWithPreferences.filter(u => u.frequency === 'weekly');

    const showEmailData = {
      id: show.id,
      name: show.name,
      artistName: show.artistName,
      venueId: show.venueId,
      date: new Date(show.date).toLocaleDateString(),
      startTime: show.startTime,
      ticketUrl: show.ticketUrl,
      announcedAt: new Date().toLocaleDateString(),
    };

    // Queue immediate notifications
    const immediatePromises = immediateUsers.map(user => 
      queueEmail({
        userId: user.userId,
        emailType: 'new_show',
        emailData: { show: showEmailData },
        scheduledFor: new Date(), // Send immediately
      })
    );

    // Queue daily notifications for next digest
    const tomorrow9AM = new Date();
    tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
    tomorrow9AM.setHours(9, 0, 0, 0);

    const dailyPromises = dailyUsers.map(user => 
      queueEmail({
        userId: user.userId,
        emailType: 'new_show',
        emailData: { show: showEmailData },
        scheduledFor: tomorrow9AM,
      })
    );

    // Queue weekly notifications for next Monday
    const nextMonday9AM = new Date();
    const daysUntilMonday = (8 - nextMonday9AM.getDay()) % 7 || 7;
    nextMonday9AM.setDate(nextMonday9AM.getDate() + daysUntilMonday);
    nextMonday9AM.setHours(9, 0, 0, 0);

    const weeklyPromises = weeklyUsers.map(user => 
      queueEmail({
        userId: user.userId,
        emailType: 'new_show',
        emailData: { show: showEmailData },
        scheduledFor: nextMonday9AM,
      })
    );

    await Promise.allSettled([...immediatePromises, ...dailyPromises, ...weeklyPromises]);

    console.log(`New show notifications queued for ${followersWithPreferences.length} users (${immediateUsers.length} immediate, ${dailyUsers.length} daily, ${weeklyUsers.length} weekly)`);
  } catch (error) {
    console.error(`Failed to trigger new show notifications for show ${showId}:`, error);
  }
}

// Trigger setlist update notifications
export async function triggerSetlistUpdateNotifications(
  showId: string, 
  newSongs: Array<{ title: string; artist?: string; encore?: boolean }>,
  updateType: 'new' | 'complete' | 'updated' = 'updated'
) {
  try {
    // Get show details
    const showData = await db
      .select({
        id: shows.id,
        name: shows.name,
        venueId: shows.venueId,
        date: shows.date,
        artistId: shows.headlinerArtistId,
        artistName: artists.name,
      })
      .from(shows)
      .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .where(eq(shows.id, showId))
      .limit(1);

    if (showData.length === 0) {
      console.error(`Show ${showId} not found`);
      return;
    }

    const show = showData[0];

    // Get users who follow this artist and want setlist notifications
    const followersWithPreferences = await db
      .select({
        userId: users.id,
        userEmail: users.email,
        userName: users.displayName,
        frequency: emailPreferences.setlistUpdateFrequency,
      })
      .from(userFollowsArtists)
      .innerJoin(users, eq(userFollowsArtists.userId, users.id))
      .innerJoin(emailPreferences, eq(users.id, emailPreferences.userId))
      .where(
        and(
          eq(userFollowsArtists.artistId, show.artistId),
          eq(emailPreferences.emailEnabled, true),
          eq(emailPreferences.setlistUpdates, true)
        )
      );

    if (followersWithPreferences.length === 0) {
      console.log(`No followers found for artist ${show.artistName} with setlist notifications enabled`);
      return;
    }

    // Group users by their notification frequency
    const immediateUsers = followersWithPreferences.filter(u => u.frequency === 'immediately');
    const dailyUsers = followersWithPreferences.filter(u => u.frequency === 'daily');
    const weeklyUsers = followersWithPreferences.filter(u => u.frequency === 'weekly');

    const emailData = {
      show: {
        id: show.id,
        name: show.name,
        artistName: show.artistName,
        venueId: show.venueId,
        date: new Date(show.date).toLocaleDateString(),
      },
      newSongs,
      totalSongs: newSongs.length, // In a real app, this would be the total from the setlist
      updateType,
    };

    // Queue notifications based on frequency preferences
    const immediatePromises = immediateUsers.map(user => 
      queueEmail({
        userId: user.userId,
        emailType: 'setlist_update',
        emailData,
        scheduledFor: new Date(),
      })
    );

    const tomorrow9AM = new Date();
    tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
    tomorrow9AM.setHours(9, 0, 0, 0);

    const dailyPromises = dailyUsers.map(user => 
      queueEmail({
        userId: user.userId,
        emailType: 'setlist_update',
        emailData,
        scheduledFor: tomorrow9AM,
      })
    );

    const nextMonday9AM = new Date();
    const daysUntilMonday = (8 - nextMonday9AM.getDay()) % 7 || 7;
    nextMonday9AM.setDate(nextMonday9AM.getDate() + daysUntilMonday);
    nextMonday9AM.setHours(9, 0, 0, 0);

    const weeklyPromises = weeklyUsers.map(user => 
      queueEmail({
        userId: user.userId,
        emailType: 'setlist_update',
        emailData,
        scheduledFor: nextMonday9AM,
      })
    );

    await Promise.allSettled([...immediatePromises, ...dailyPromises, ...weeklyPromises]);

    console.log(`Setlist update notifications queued for ${followersWithPreferences.length} users`);
  } catch (error) {
    console.error(`Failed to trigger setlist update notifications for show ${showId}:`, error);
  }
}

// Trigger email verification
export async function triggerEmailVerification(userId: string, verificationToken: string) {
  try {
    const user = await db
      .select({
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      console.error(`User ${userId} not found`);
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://MySetlist.app';
    const verificationUrl = `${appUrl}/auth/verify?token=${verificationToken}`;

    await queueEmail({
      userId,
      emailType: 'email_verification',
      emailData: {
        name: user[0].displayName || 'Music Lover',
        verificationUrl,
        expirationHours: 24,
      },
      scheduledFor: new Date(), // Send immediately
    });

    console.log(`Email verification queued for user ${userId}`);
  } catch (error) {
    console.error(`Failed to trigger email verification for user ${userId}:`, error);
  }
}

// Trigger password reset email
export async function triggerPasswordReset(userId: string, resetToken: string) {
  try {
    const user = await db
      .select({
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      console.error(`User ${userId} not found`);
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://MySetlist.app';
    const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}`;

    await queueEmail({
      userId,
      emailType: 'password_reset',
      emailData: {
        name: user[0].displayName || 'Music Lover',
        resetUrl,
        expirationHours: 24,
      },
      scheduledFor: new Date(), // Send immediately
    });

    console.log(`Password reset email queued for user ${userId}`);
  } catch (error) {
    console.error(`Failed to trigger password reset for user ${userId}:`, error);
  }
}