'use server';

import { auth } from '@/lib/supabase/server';
import { db } from '@repo/database';
import { 
  sendWelcomeEmail,
  sendShowReminderEmail,
  sendNewShowNotificationEmail,
  sendSetlistUpdateEmail,
  sendWeeklyDigestEmail,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendBatchEmails,
  generateUnsubscribeToken,
  validateUnsubscribeToken
} from '@repo/email';
import { 
  emailPreferences, 
  emailQueue, 
  emailLogs, 
  emailUnsubscribes,
  users,
  userFollowsArtists,
  shows,
  artists,
  venues
} from '@repo/database/src/schema';
import { eq, and, or, gte, lte, desc, sql, isNull } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// Types
type EmailNotificationData = {
  userName: string;
  userEmail: string;
  appUrl: string;
};

type ShowData = {
  id: string;
  name: string;
  artistName: string;
  venue: string;
  date: string;
  time?: string;
  ticketUrl?: string;
};

// Validation schemas
const updateEmailPreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  showReminders: z.boolean().optional(),
  showReminderFrequency: z.enum(['immediately', 'daily', 'weekly', 'never']).optional(),
  newShowNotifications: z.boolean().optional(),
  newShowFrequency: z.enum(['immediately', 'daily', 'weekly', 'never']).optional(),
  setlistUpdates: z.boolean().optional(),
  setlistUpdateFrequency: z.enum(['immediately', 'daily', 'weekly', 'never']).optional(),
  weeklyDigest: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
});

// Helper function to get app URL
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://MySetlist.app';
}

// Get user email preferences
export async function getUserEmailPreferences() {
  const { user } = await auth();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const preferences = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, user.id))
    .limit(1);

  if (preferences.length === 0) {
    // Create default preferences for new user
    const defaultPrefs = {
      userId: user.id,
      emailEnabled: true,
      showReminders: true,
      showReminderFrequency: 'daily' as const,
      newShowNotifications: true,
      newShowFrequency: 'immediately' as const,
      setlistUpdates: true,
      setlistUpdateFrequency: 'immediately' as const,
      weeklyDigest: true,
      marketingEmails: false,
      securityEmails: true,
    };

    await db.insert(emailPreferences).values(defaultPrefs);
    return defaultPrefs;
  }

  return preferences[0];
}

// Update user email preferences
export async function updateEmailPreferences(data: z.infer<typeof updateEmailPreferencesSchema>) {
  const { user } = await auth();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const validatedData = updateEmailPreferencesSchema.parse(data);

  await db
    .update(emailPreferences)
    .set({
      ...validatedData,
      updatedAt: new Date(),
    })
    .where(eq(emailPreferences.userId, user.id));

  return { success: true };
}

// Send welcome email immediately
export async function sendWelcomeEmailAction(userId: string) {
  const user = await db
    .select({
      email: users.email,
      displayName: users.displayName,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user.length === 0) {
    throw new Error('User not found');
  }

  const result = await sendWelcomeEmail({
    to: [{ email: user[0].email, name: user[0].displayName || undefined }],
    name: user[0].displayName || 'Music Lover',
    appUrl: getAppUrl(),
  });

  // Log the email
  await db.insert(emailLogs).values({
    userId,
    emailType: 'welcome',
    subject: 'Welcome to MySetlist! 🎵',
    recipient: user[0].email,
    status: result.success ? 'sent' : 'failed',
    resendId: result.success && result.data ? result.data.id : undefined,
    sentAt: result.success ? new Date() : undefined,
  });

  return result;
}

// Queue email for later sending
export async function queueEmail({
  userId,
  emailType,
  emailData,
  scheduledFor,
}: {
  userId: string;
  emailType: 'welcome' | 'show_reminder' | 'new_show' | 'setlist_update' | 'weekly_digest' | 'password_reset' | 'email_verification';
  emailData: Record<string, any>;
  scheduledFor: Date;
}) {
  await db.insert(emailQueue).values({
    userId,
    emailType,
    emailData: JSON.stringify(emailData),
    scheduledFor,
  });

  return { success: true };
}

// Process queued emails
export async function processQueuedEmails() {
  const now = new Date();
  
  const queuedEmails = await db
    .select({
      id: emailQueue.id,
      userId: emailQueue.userId,
      emailType: emailQueue.emailType,
      emailData: emailQueue.emailData,
      attempts: emailQueue.attempts,
      maxAttempts: emailQueue.maxAttempts,
      userEmail: users.email,
      userName: users.displayName,
    })
    .from(emailQueue)
    .innerJoin(users, eq(emailQueue.userId, users.id))
    .where(
      and(
        lte(emailQueue.scheduledFor, now),
        isNull(emailQueue.sentAt),
        isNull(emailQueue.failedAt)
      )
    )
    .orderBy(emailQueue.scheduledFor)
    .limit(100); // Process in batches

  const results = [];

  for (const queuedEmail of queuedEmails) {
    try {
      const emailData = JSON.parse(queuedEmail.emailData || '{}');
      const appUrl = getAppUrl();
      
      let result;
      
      switch (queuedEmail.emailType) {
        case 'welcome':
          result = await sendWelcomeEmail({
            to: [{ email: queuedEmail.userEmail, name: queuedEmail.userName || undefined }],
            name: queuedEmail.userName || 'Music Lover',
            appUrl,
          });
          break;
          
        case 'show_reminder':
          result = await sendShowReminderEmail({
            to: [{ email: queuedEmail.userEmail, name: queuedEmail.userName || undefined }],
            userName: queuedEmail.userName || 'Music Lover',
            show: emailData.show,
            daysUntilShow: emailData.daysUntilShow,
            appUrl,
          });
          break;
          
        case 'new_show':
          result = await sendNewShowNotificationEmail({
            to: [{ email: queuedEmail.userEmail, name: queuedEmail.userName || undefined }],
            userName: queuedEmail.userName || 'Music Lover',
            show: emailData.show,
            appUrl,
          });
          break;
          
        case 'setlist_update':
          result = await sendSetlistUpdateEmail({
            to: [{ email: queuedEmail.userEmail, name: queuedEmail.userName || undefined }],
            userName: queuedEmail.userName || 'Music Lover',
            show: emailData.show,
            newSongs: emailData.newSongs,
            totalSongs: emailData.totalSongs,
            updateType: emailData.updateType,
            appUrl,
          });
          break;
          
        case 'weekly_digest':
          result = await sendWeeklyDigestEmail({
            to: [{ email: queuedEmail.userEmail, name: queuedEmail.userName || undefined }],
            userName: queuedEmail.userName || 'Music Lover',
            weekOf: emailData.weekOf,
            followedArtists: emailData.followedArtists,
            upcomingShows: emailData.upcomingShows,
            newSetlists: emailData.newSetlists,
            totalFollowedArtists: emailData.totalFollowedArtists,
            appUrl,
          });
          break;
          
        default:
          throw new Error(`Unknown email type: ${queuedEmail.emailType}`);
      }
      
      if (result.success) {
        // Mark as sent
        await db
          .update(emailQueue)
          .set({ sentAt: now })
          .where(eq(emailQueue.id, queuedEmail.id));
          
        // Log the email
        await db.insert(emailLogs).values({
          userId: queuedEmail.userId,
          emailType: queuedEmail.emailType,
          subject: `${queuedEmail.emailType} email`,
          recipient: queuedEmail.userEmail,
          status: 'sent',
          resendId: result.data ? result.data.id : undefined,
          sentAt: now,
        });
        
        results.push({ id: queuedEmail.id, success: true });
      } else {
        throw new Error(result.error?.message || 'Unknown error');
      }
      
    } catch (error) {
      const newAttempts = queuedEmail.attempts + 1;
      
      if (newAttempts >= queuedEmail.maxAttempts) {
        // Mark as failed
        await db
          .update(emailQueue)
          .set({ 
            failedAt: now, 
            lastError: (error as Error).message,
            attempts: newAttempts 
          })
          .where(eq(emailQueue.id, queuedEmail.id));
      } else {
        // Increment attempts and schedule retry
        const retryDelay = Math.pow(2, newAttempts) * 60000; // Exponential backoff
        await db
          .update(emailQueue)
          .set({ 
            attempts: newAttempts,
            lastError: (error as Error).message,
            scheduledFor: new Date(now.getTime() + retryDelay)
          })
          .where(eq(emailQueue.id, queuedEmail.id));
      }
      
      results.push({ id: queuedEmail.id, success: false, error: (error as Error).message });
    }
  }
  
  return {
    processed: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
}

// Send daily show reminders
export async function sendDailyShowReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
  
  // Get users who want daily reminders and have shows tomorrow
  const usersWithUpcomingShows = await db
    .select({
      userId: users.id,
      userEmail: users.email,
      userName: users.displayName,
      showId: shows.id,
      showName: shows.name,
      artistName: artists.name,
      venueName: venues.name,
      date: shows.date,
    })
    .from(users)
    .innerJoin(emailPreferences, eq(users.id, emailPreferences.userId))
    .innerJoin(userFollowsArtists, eq(users.id, userFollowsArtists.userId))
    .innerJoin(shows, eq(userFollowsArtists.artistId, shows.headlinerArtistId))
    .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
    .leftJoin(venues, eq(shows.venueId, venues.id))
    .where(
      and(
        eq(emailPreferences.emailEnabled, true),
        eq(emailPreferences.showReminders, true),
        eq(emailPreferences.showReminderFrequency, 'daily'),
        gte(shows.date, tomorrow.toISOString().split('T')[0]),
        lte(shows.date, dayAfterTomorrow.toISOString().split('T')[0])
      )
    );
  
  // Group by user
  const userShowMap = new Map<string, {
    userEmail: string;
    userName: string | null;
    shows: ShowData[];
  }>();
  
  for (const row of usersWithUpcomingShows) {
    if (!userShowMap.has(row.userId)) {
      userShowMap.set(row.userId, {
        userEmail: row.userEmail,
        userName: row.userName,
        shows: [],
      });
    }
    
    userShowMap.get(row.userId)!.shows.push({
      id: row.showId,
      name: row.showName,
      artistName: row.artistName,
      venue: row.venueName || 'TBA',
      date: row.date,
    });
  }
  
  // Queue reminder emails
  const queuePromises = [];
  
  for (const [userId, userData] of userShowMap) {
    for (const show of userData.shows) {
      queuePromises.push(
        queueEmail({
          userId,
          emailType: 'show_reminder',
          emailData: {
            show,
            daysUntilShow: 1,
          },
          scheduledFor: new Date(), // Send immediately
        })
      );
    }
  }
  
  await Promise.allSettled(queuePromises);
  
  return {
    usersNotified: userShowMap.size,
    showsNotified: usersWithUpcomingShows.length,
  };
}

// Send weekly digest emails
export async function sendWeeklyDigests() {
  const usersWithPreferences = await db
    .select({
      userId: users.id,
      userEmail: users.email,
      userName: users.displayName,
    })
    .from(users)
    .innerJoin(emailPreferences, eq(users.id, emailPreferences.userId))
    .where(
      and(
        eq(emailPreferences.emailEnabled, true),
        eq(emailPreferences.weeklyDigest, true)
      )
    );
  
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date();
  weekEnd.setHours(23, 59, 59, 999);
  
  const queuePromises = [];
  
  for (const user of usersWithPreferences) {
    // Get user's followed artists with upcoming shows
    const followedArtists = await db
      .select({
        id: artists.id,
        name: artists.name,
        upcomingShows: sql<number>`COALESCE(COUNT(${shows.id}), 0)`,
      })
      .from(userFollowsArtists)
      .innerJoin(artists, eq(userFollowsArtists.artistId, artists.id))
      .leftJoin(shows, and(
        eq(artists.id, shows.headlinerArtistId),
        gte(shows.date, new Date().toISOString().split('T')[0])
      ))
      .where(eq(userFollowsArtists.userId, user.userId))
      .groupBy(artists.id, artists.name)
      .limit(10);
    
    // Get upcoming shows this week
    const upcomingShows = await db
      .select({
        id: shows.id,
        name: shows.name,
        artistName: artists.name,
        venueName: venues.name,
        date: shows.date,
      })
      .from(userFollowsArtists)
      .innerJoin(shows, eq(userFollowsArtists.artistId, shows.headlinerArtistId))
      .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(
        and(
          eq(userFollowsArtists.userId, user.userId),
          gte(shows.date, weekStart.toISOString().split('T')[0]),
          lte(shows.date, weekEnd.toISOString().split('T')[0])
        )
      )
      .limit(5);
    
    // Get new setlists this week
    const newSetlists = await db
      .select({
        id: shows.id,
        name: shows.name,
        artistName: artists.name,
        venueName: venues.name,
        date: shows.date,
      })
      .from(userFollowsArtists)
      .innerJoin(shows, eq(userFollowsArtists.artistId, shows.headlinerArtistId))
      .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(
        and(
          eq(userFollowsArtists.userId, user.userId),
          gte(shows.updatedAt, weekStart),
          lte(shows.updatedAt, weekEnd)
        )
      )
      .limit(5);
    
    const weekOf = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
    
    queuePromises.push(
      queueEmail({
        userId: user.userId,
        emailType: 'weekly_digest',
        emailData: {
          weekOf,
          followedArtists: followedArtists.map(artist => ({
            id: artist.id,
            name: artist.name,
            upcomingShows: Number(artist.upcomingShows),
          })),
          upcomingShows: upcomingShows.map(show => ({
            id: show.id,
            name: show.name,
            artistName: show.artistName,
            venue: show.venueName || 'TBA',
            date: show.date,
          })),
          newSetlists: newSetlists.map(show => ({
            id: show.id,
            name: show.name,
            artistName: show.artistName,
            venue: show.venueName || 'TBA',
            date: show.date,
          })),
          totalFollowedArtists: followedArtists.length,
        },
        scheduledFor: new Date(), // Send immediately
      })
    );
  }
  
  await Promise.allSettled(queuePromises);
  
  return {
    usersNotified: usersWithPreferences.length,
  };
}

// Unsubscribe from emails
export async function unsubscribeFromEmails(token: string, emailType?: string) {
  const tokenData = validateUnsubscribeToken(token);
  
  if (!tokenData) {
    throw new Error('Invalid or expired unsubscribe token');
  }
  
  const { userId, emailType: tokenEmailType } = tokenData;
  const unsubscribeType = emailType || tokenEmailType;
  
  // Add to unsubscribe table
  await db
    .insert(emailUnsubscribes)
    .values({
      userId,
      emailType: unsubscribeType as any,
      token,
    })
    .onConflictDoNothing();
  
  // Update preferences based on email type
  const updateData: Partial<typeof emailPreferences.$inferInsert> = {};
  
  switch (unsubscribeType) {
    case 'show_reminders':
      updateData.showReminders = false;
      break;
    case 'new_shows':
      updateData.newShowNotifications = false;
      break;
    case 'setlist_updates':
      updateData.setlistUpdates = false;
      break;
    case 'weekly_digest':
      updateData.weeklyDigest = false;
      break;
    case 'marketing':
      updateData.marketingEmails = false;
      break;
    case 'all':
      updateData.emailEnabled = false;
      break;
  }
  
  if (Object.keys(updateData).length > 0) {
    await db
      .update(emailPreferences)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(emailPreferences.userId, userId));
  }
  
  return { success: true, unsubscribeType };
}

// Handle unsubscribe page
export async function handleUnsubscribe(token: string, emailType?: string) {
  try {
    const result = await unsubscribeFromEmails(token, emailType);
    redirect(`/unsubscribe/success?type=${result.unsubscribeType}`);
  } catch (error) {
    redirect('/unsubscribe/error');
  }
}