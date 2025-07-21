'use server';

import { db } from '@repo/database';
import {
  artists,
  emailLogs,
  emailPreferences,
  emailQueue,
  shows,
  // Following removed: userFollowsArtists,
  users,
} from '@repo/database';
import {
  type EmailAddress,
  sendBatchEmails,
  sendShowReminderEmail,
  sendVoteMilestoneEmail,
  sendWeeklyDigestEmail,
  sendWelcomeEmail as sendWelcomeEmailTemplate,
} from '@repo/email';
import { and, eq, gte, inArray, isNotNull, isNull, lt, lte } from 'drizzle-orm';

// Generic email notification function
export async function sendEmailNotification(_params: {
  to: string;
  subject: string;
  content: string;
}) {
  try {
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

// Send daily show reminders
export async function sendDailyShowReminders() {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0]!;
    const tomorrowStr = tomorrow.toISOString().split('T')[0]!;

    // Get all shows happening today or tomorrow
    const upcomingShows = await db
      .select({
        show: shows,
        artist: artists,
      })
      .from(shows)
      .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .where(
        and(
          gte(shows.date, todayStr),
          lte(shows.date, tomorrowStr),
          eq(shows.status, 'upcoming')
        )
      );

    if (!upcomingShows.length) {
      return {
        success: true,
        usersNotified: 0,
        showsNotified: 0,
      };
    }

    // TODO: Implement user attendance tracking
    // The userShowAttendance table doesn't exist yet in the schema
    // For now, return success without sending reminders
    let totalUsersNotified = 0;
    let totalShowsNotified = 0;

    /* Commented out until userShowAttendance table is implemented
    // Group attendees by show
    const showAttendees = new Map<
      string,
      Array<{ userId: string; userName: string; userEmail: string }>
    >();

    for (const record of upcomingShows) {
      if (!record.attendees?.userId) {
        continue;
      }

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, record.attendees.userId))
        .limit(1);

      if (user[0]?.email) {
        const showId = record.show.id;
        if (!showAttendees.has(showId)) {
          showAttendees.set(showId, []);
        }
        showAttendees.get(showId)?.push({
          userId: user[0].id,
          userName: user[0].displayName || 'there',
          userEmail: user[0].email,
        });
      }
    }

    // Send reminders for each show
    for (const [showId, attendees] of showAttendees) {
      const showData = upcomingShows.find((s: any) => s.show.id === showId);
      if (!showData) {
        continue;
      }

      const daysUntilShow = showData.show.date === todayStr ? 0 : 1;

      // Check email preferences for each attendee
      const emailsToSend: EmailAddress[] = [];

      for (const attendee of attendees) {
        const prefs = await db
          .select()
          .from(emailPreferences)
          .where(eq(emailPreferences.userId, attendee.userId))
          .limit(1);

        if (!prefs[0] || prefs[0].showReminders) {
          emailsToSend.push({
            email: attendee.userEmail,
            name: attendee.userName,
          });
        }
      }

      if (emailsToSend.length > 0) {
        const venue = showData.show.venueId
          ? `Venue ${showData.show.venueId}`
          : // In production, join with venues table
            'TBA';

        await sendShowReminderEmail({
          to: emailsToSend,
          userName: 'there', // Will be personalized in batch send
          show: {
            id: showData.show.id,
            name: showData.show.name,
            artistName: showData.artist.name,
            venue: venue,
            date: new Date(showData.show.date).toLocaleDateString(),
            time: showData.show.startTime || 'TBA',
            ticketUrl: showData.show.ticketUrl || '',
          },
          daysUntilShow,
          appUrl: process.env['NEXT_PUBLIC_APP_URL'] || 'https://mysetlist.app',
        });

        totalUsersNotified += emailsToSend.length;
        totalShowsNotified++;
      }
    }
    */

    return {
      success: true,
      usersNotified: totalUsersNotified,
      showsNotified: totalShowsNotified,
    };
  } catch (error) {
    return {
      success: false,
      usersNotified: 0,
      showsNotified: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Send weekly digest emails
export async function sendWeeklyDigests() {
  try {
    // Get all users with weekly digest enabled
    const usersWithDigest = await db
      .select({
        user: users,
        prefs: emailPreferences,
      })
      .from(users)
      .innerJoin(emailPreferences, eq(emailPreferences.userId, users.id))
      .where(
        and(eq(emailPreferences.weeklyDigest, true), isNotNull(users.email))
      );

    if (!usersWithDigest.length) {
      return {
        success: true,
        usersNotified: 0,
      };
    }

    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAhead = new Date(today);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const weekOfStr = `${weekAgo.toLocaleDateString()} - ${today.toLocaleDateString()}`;

    let totalUsersNotified = 0;

    for (const record of usersWithDigest) {
      if (!record.user.email) {
        continue;
      }

      // Get popular artists (replaces followed artists)
      const popularArtists = await db
        .select({
          artist: artists,
        })
        .from(artists)
        .orderBy(artists.trendingScore)
        .limit(10);

      if (!popularArtists.length) {
        continue;
      }

      const artistIds = popularArtists.map((f: any) => f.artist.id);

      // Get upcoming shows for popular artists
      const upcomingShows = await db
        .select({
          show: shows,
          artist: artists,
        })
        .from(shows)
        .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
        .where(
          and(
            inArray(shows.headlinerArtistId, artistIds),
            gte(shows.date, today.toISOString().split('T')[0]!),
            lte(shows.date, weekAhead.toISOString().split('T')[0]!)
          )
        )
        .limit(10);

      // Format data for email
      const artistsWithActivity = popularArtists.slice(0, 5).map((f: any) => ({
        id: f.artist.id,
        name: f.artist.name,
        upcomingShows: upcomingShows.filter((s: any) => s.artist.id === f.artist.id)
          .length,
      }));

      const formattedShows = upcomingShows.slice(0, 5).map((s: any) => ({
        id: s.show.id,
        name: s.show.name,
        artistName: s.artist.name,
        venue: 'Venue TBA', // In production, join with venues
        date: new Date(s.show.date).toLocaleDateString(),
      }));

      await sendWeeklyDigestEmail({
        to: [
          {
            email: record.user.email,
            name: record.user.displayName || 'there',
          },
        ],
        userName: record.user.displayName || 'there',
        weekOf: weekOfStr,
        followedArtists: artistsWithActivity,
        upcomingShows: formattedShows,
        newSetlists: [], // Would need to track new setlists in production
        totalFollowedArtists: popularArtists.length,
        appUrl: process.env['NEXT_PUBLIC_APP_URL'] || 'https://mysetlist.app',
      });

      totalUsersNotified++;
    }

    return {
      success: true,
      usersNotified: totalUsersNotified,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Send vote notification when a song reaches a milestone
export async function sendVoteNotification(params: {
  userId: string;
  showId: string;
  songId: string;
  milestone: number;
  totalVotes: number;
}) {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, params.userId))
      .limit(1);

    if (!user[0]?.email) {
      return { success: false, error: 'User not found or no email' };
    }

    // Check email preferences
    const prefs = await db
      .select()
      .from(emailPreferences)
      .where(eq(emailPreferences.userId, params.userId))
      .limit(1);

    if (prefs[0] && !prefs[0].setlistUpdates) {
      return { success: true, skipped: true };
    }

    // Get show and song details
    const showData = await db
      .select({
        show: shows,
        artist: artists,
      })
      .from(shows)
      .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .where(eq(shows.id, params.showId))
      .limit(1);

    if (!showData[0]) {
      return { success: false, error: 'Show not found' };
    }

    await sendVoteMilestoneEmail({
      to: [{ email: user[0].email, name: user[0].displayName || 'there' }],
      userName: user[0].displayName || 'there',
      show: {
        id: showData[0].show.id,
        name: showData[0].show.name,
        artistName: showData[0].artist.name,
        venue: 'Venue TBA',
        date: new Date(showData[0].show.date).toLocaleDateString(),
      },
      song: {
        title: 'Song Title', // Would need to join with songs table
        votes: params.totalVotes,
        position: 1,
      },
      milestone: params.milestone,
      totalVotes: params.totalVotes,
      appUrl: process.env['NEXT_PUBLIC_APP_URL'] || 'https://mysetlist.app',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Send notification for new show announcements
export async function sendNewShowNotification(params: {
  artistId: string;
  showId: string;
}) {
  try {
    // Get show details
    const showData = await db
      .select({
        show: shows,
        artist: artists,
      })
      .from(shows)
      .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
      .where(eq(shows.id, params.showId))
      .limit(1);

    if (!showData[0]) {
      return { success: false, error: 'Show not found' };
    }

    // Get users interested in this type of content (replaces followers)
    const interestedUsers = await db
      .select({
        user: users,
        prefs: emailPreferences,
      })
      .from(users)
      .leftJoin(emailPreferences, eq(emailPreferences.userId, users.id))
      .where(isNotNull(users.email))
      .limit(100); // Limit to sample of users instead of followers

    const emailsToSend: EmailAddress[] = [];

    for (const user of interestedUsers) {
      if (!user.user.email) {
        continue;
      }

      // Check if new show notifications are enabled (default true if no prefs)
      if (!user.prefs || user.prefs.newShowNotifications) {
        const emailAddress: EmailAddress = { email: user.user.email };
        if (user.user.displayName) {
          emailAddress.name = user.user.displayName;
        }
        emailsToSend.push(emailAddress);
      }
    }

    if (emailsToSend.length > 0) {
      // Send in batches
      const results = await sendBatchEmails({
        emails: emailsToSend.map((e) => ({
          ...e,
          email: e.email,
          userName: e.name || 'there',
          show: {
            id: showData[0]?.show.id,
            name: showData[0]?.show.name,
            artistName: showData[0]?.artist.name,
            venue: 'Venue TBA',
            date: new Date(showData[0]?.show.date || new Date()).toLocaleDateString(),
            announcedAt: new Date().toISOString(),
          },
        })),
        template: (data) => {
          // This would use the rendered template in production
          return `New show announcement for ${data.show.artistName}`;
        },
        getSubject: (data) =>
          `🎵 ${data.show.artistName} just announced a new show!`,
        batchSize: 50,
      });

      return {
        success: true,
        usersNotified: results.totalSent,
      };
    }

    return { success: true, usersNotified: 0 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Send welcome email to new users
export async function sendWelcomeEmailAction(userId: string) {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]?.email) {
      return { success: false, error: 'User not found or no email' };
    }

    const toAddress: EmailAddress = { email: user[0].email };
    if (user[0].displayName) {
      toAddress.name = user[0].displayName;
    }

    await sendWelcomeEmailTemplate({
      to: [toAddress],
      name: user[0].displayName || 'there',
      appUrl: process.env['NEXT_PUBLIC_APP_URL'] || 'https://mysetlist.app',
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Legacy functions for backward compatibility
export async function sendDailyReminders() {
  return sendDailyShowReminders();
}

export async function sendWeeklyDigest() {
  return sendWeeklyDigests();
}

export async function processEmailQueue() {
  return { success: true };
}

export async function processQueuedEmails() {
  try {
    const now = new Date();

    // Get queued emails that are scheduled to be sent
    const queuedEmails = await db
      .select({
        queue: emailQueue,
        user: users,
      })
      .from(emailQueue)
      .innerJoin(users, eq(users.id, emailQueue.userId))
      .where(
        and(
          lte(emailQueue.scheduledFor, now),
          isNull(emailQueue.sentAt),
          isNull(emailQueue.failedAt),
          lt(emailQueue.attempts, emailQueue.maxAttempts)
        )
      )
      .limit(100); // Process up to 100 emails at a time

    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const record of queuedEmails) {
      processed++;

      try {
        // Parse email data
        const emailData = record.queue.emailData
          ? JSON.parse(record.queue.emailData)
          : {};

        // Send email based on type
        let result: { success: boolean; error?: string };

        switch (record.queue.emailType) {
          case 'welcome':
            result = await sendWelcomeEmailAction(record.queue.userId);
            break;

          case 'show_reminder': {
            const showReminderResult = await sendShowReminderEmail({
              to: [
                {
                  email: record.user.email!,
                  name: record.user.displayName || 'there',
                },
              ],
              userName: record.user.displayName || 'there',
              show: emailData.show,
              daysUntilShow: emailData.daysUntilShow,
            });
            result = {
              success: showReminderResult.success,
              ...(showReminderResult.error?.message && {
                error: showReminderResult.error.message,
              }),
            };
            break;
          }

          case 'new_show':
            result = await sendNewShowNotification({
              artistId: emailData.artistId,
              showId: emailData.showId,
            });
            break;

          case 'weekly_digest':
            // This is handled by a separate cron job
            result = { success: true };
            break;

          default:
            result = {
              success: false,
              error: `Unknown email type: ${record.queue.emailType}`,
            };
        }

        if (result.success) {
          // Mark as sent
          await db
            .update(emailQueue)
            .set({
              sentAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(emailQueue.id, record.queue.id));

          // Log successful send
          await db.insert(emailLogs).values({
            userId: record.queue.userId,
            emailType: record.queue.emailType,
            subject: `${record.queue.emailType} email`,
            recipient: record.user.email!,
            status: 'sent',
            sentAt: new Date(),
          });

          successful++;
        } else {
          // Update attempts and error
          await db
            .update(emailQueue)
            .set({
              attempts: record.queue.attempts + 1,
              lastError: result.error || 'Unknown error',
              failedAt:
                record.queue.attempts + 1 >= record.queue.maxAttempts
                  ? new Date()
                  : null,
              updatedAt: new Date(),
            })
            .where(eq(emailQueue.id, record.queue.id));

          failed++;
        }
      } catch (error) {
        // Update attempts and error
        await db
          .update(emailQueue)
          .set({
            attempts: record.queue.attempts + 1,
            lastError: error instanceof Error ? error.message : 'Unknown error',
            failedAt:
              record.queue.attempts + 1 >= record.queue.maxAttempts
                ? new Date()
                : null,
            updatedAt: new Date(),
          })
          .where(eq(emailQueue.id, record.queue.id));

        failed++;
      }
    }

    return {
      success: true,
      processed,
      successful,
      failed,
    };
  } catch (error) {
    return {
      success: false,
      processed: 0,
      successful: 0,
      failed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Get user email preferences
export async function getUserEmailPreferences() {
  // This would fetch from database
  return {
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
}

// Update user email preferences
export async function updateEmailPreferences(_data: any) {
  return { success: true };
}

// Queue email for later sending
export async function queueEmail(params: {
  userId: string;
  emailType:
    | 'welcome'
    | 'show_reminder'
    | 'new_show'
    | 'setlist_update'
    | 'weekly_digest'
    | 'password_reset'
    | 'email_verification';
  emailData: any;
  scheduledFor: Date;
}) {
  try {
    const queueEntry = await db
      .insert(emailQueue)
      .values({
        userId: params.userId,
        emailType: params.emailType,
        emailData: JSON.stringify(params.emailData),
        scheduledFor: params.scheduledFor,
      })
      .returning();

    return {
      success: true,
      queueId: queueEntry[0]?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Handle unsubscribe
export async function handleUnsubscribe(_token: string, _emailType?: string) {
  return { success: true };
}
