import { db } from '@repo/database';
import {
  emailLogs,
  emailPreferences,
  emailQueue,
  emailQueueEnhanced,
  emailUnsubscribes,
  transactionalEmails,
  userNotificationPreferences,
  users,
  artists,
  shows,
  venues,
} from '@repo/database';
import { and, eq, gte, inArray, isNotNull, isNull, lt, lte, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import {
  sendWelcomeEmail,
  sendShowReminderEmail,
  sendNewShowNotificationEmail,
  sendWeeklyDigestEmail,
  sendVoteMilestoneEmail,
  type EmailAddress,
} from '@repo/email';
import { processEmailAutomation } from '~/lib/email/automation-engine';

// Rate limiting configuration
const EMAIL_RATE_LIMITS = {
  WELCOME_EMAILS_PER_HOUR: 100,
  REMINDER_EMAILS_PER_HOUR: 500,
  MARKETING_EMAILS_PER_HOUR: 200,
  WEEKLY_DIGEST_PER_HOUR: 1000,
  MAX_BATCH_SIZE: 50,
  MAX_TOTAL_EMAILS_PER_RUN: 1000,
} as const;

// Email throttling tracker (in-memory for this cron job)
let emailsSentThisHour = {
  welcome: 0,
  reminder: 0,
  marketing: 0,
  digest: 0,
  total: 0,
  lastReset: Date.now(),
};

// Reset counters every hour
function resetRateLimitsIfNeeded() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  if (emailsSentThisHour.lastReset < oneHourAgo) {
    emailsSentThisHour = {
      welcome: 0,
      reminder: 0,
      marketing: 0,
      digest: 0,
      total: 0,
      lastReset: Date.now(),
    };
  }
}

// Check if we can send more emails of a specific type
function canSendEmail(emailType: keyof typeof EMAIL_RATE_LIMITS): boolean {
  resetRateLimitsIfNeeded();
  
  if (emailsSentThisHour.total >= EMAIL_RATE_LIMITS.MAX_TOTAL_EMAILS_PER_RUN) {
    return false;
  }

  switch (emailType) {
    case 'WELCOME_EMAILS_PER_HOUR':
      return emailsSentThisHour.welcome < EMAIL_RATE_LIMITS.WELCOME_EMAILS_PER_HOUR;
    case 'REMINDER_EMAILS_PER_HOUR':
      return emailsSentThisHour.reminder < EMAIL_RATE_LIMITS.REMINDER_EMAILS_PER_HOUR;
    case 'MARKETING_EMAILS_PER_HOUR':
      return emailsSentThisHour.marketing < EMAIL_RATE_LIMITS.MARKETING_EMAILS_PER_HOUR;
    case 'WEEKLY_DIGEST_PER_HOUR':
      return emailsSentThisHour.digest < EMAIL_RATE_LIMITS.WEEKLY_DIGEST_PER_HOUR;
    default:
      return false;
  }
}

// Increment email counter
function incrementEmailCounter(emailType: 'welcome' | 'reminder' | 'marketing' | 'digest') {
  emailsSentThisHour[emailType]++;
  emailsSentThisHour.total++;
}

// Protect the cron endpoint
function isValidCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env['CRON_SECRET'];

  if (!cronSecret) {
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

// Check if user has email preferences that allow this email type
async function checkUserEmailPreferences(
  userId: string,
  emailType: 'welcome' | 'show_reminder' | 'new_show' | 'setlist_update' | 'weekly_digest'
): Promise<boolean> {
  try {
    const prefs = await db
      .select()
      .from(emailPreferences)
      .where(eq(emailPreferences.userId, userId))
      .limit(1);

    // Default to allowing emails if no preferences found
    if (!prefs[0]) {
      return true;
    }

    const pref = prefs[0];

    switch (emailType) {
      case 'welcome':
        return pref.emailEnabled;
      case 'show_reminder':
        return pref.emailEnabled && pref.showReminders;
      case 'new_show':
        return pref.emailEnabled && pref.newShowNotifications;
      case 'setlist_update':
        return pref.emailEnabled && pref.setlistUpdates;
      case 'weekly_digest':
        return pref.emailEnabled && pref.weeklyDigest;
      default:
        return false;
    }
  } catch (error) {
    // On error, default to not sending (safe mode)
    console.error('Error checking email preferences:', error);
    return false;
  }
}

// Check if user has unsubscribed from this email type
async function checkUnsubscribeStatus(
  userId: string,
  emailType: 'show_reminders' | 'new_shows' | 'setlist_updates' | 'weekly_digest' | 'marketing' | 'all'
): Promise<boolean> {
  try {
    const unsubscribe = await db
      .select()
      .from(emailUnsubscribes)
      .where(
        and(
          eq(emailUnsubscribes.userId, userId),
          inArray(emailUnsubscribes.emailType, [emailType, 'all'])
        )
      )
      .limit(1);

    return unsubscribe.length > 0;
  } catch (error) {
    console.error('Error checking unsubscribe status:', error);
    return false; // If error, assume not unsubscribed
  }
}

// Log email send result
async function logEmailResult(
  userId: string,
  emailType: string,
  subject: string,
  recipient: string,
  success: boolean,
  error?: string
) {
  try {
    await db.insert(emailLogs).values({
      userId,
      emailType,
      subject,
      recipient,
      status: success ? 'sent' : 'failed',
      sentAt: success ? new Date() : null,
      resendId: null, // Would be set by actual email provider
    });
  } catch (logError) {
    console.error('Failed to log email result:', logError);
  }
}

// Process welcome emails for new users
async function processWelcomeEmails(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    if (!canSendEmail('WELCOME_EMAILS_PER_HOUR')) {
      return results;
    }

    // Get queued welcome emails
    const queuedWelcome = await db
      .select({
        queue: emailQueue,
        user: users,
      })
      .from(emailQueue)
      .innerJoin(users, eq(users.id, emailQueue.userId))
      .where(
        and(
          eq(emailQueue.emailType, 'welcome'),
          lte(emailQueue.scheduledFor, new Date()),
          isNull(emailQueue.sentAt),
          isNull(emailQueue.failedAt),
          lt(emailQueue.attempts, emailQueue.maxAttempts)
        )
      )
      .limit(EMAIL_RATE_LIMITS.MAX_BATCH_SIZE);

    for (const record of queuedWelcome) {
      if (!canSendEmail('WELCOME_EMAILS_PER_HOUR')) break;

      results.processed++;

      try {
        // Check preferences
        const canSend = await checkUserEmailPreferences(record.queue.userId, 'welcome');
        if (!canSend) {
          // Mark as sent to avoid retry
          await db
            .update(emailQueue)
            .set({ sentAt: new Date(), updatedAt: new Date() })
            .where(eq(emailQueue.id, record.queue.id));
          continue;
        }

        const emailResult = await sendWelcomeEmail({
          to: [
            {
              email: record.user.email!,
              name: record.user.displayName || 'there',
            },
          ],
          name: record.user.displayName || 'there',
          appUrl: process.env['NEXT_PUBLIC_APP_URL'] || 'https://mysetlist.app',
        });

        if (emailResult.success) {
          await db
            .update(emailQueue)
            .set({ sentAt: new Date(), updatedAt: new Date() })
            .where(eq(emailQueue.id, record.queue.id));

          await logEmailResult(
            record.queue.userId,
            'welcome',
            'Welcome to MySetlist',
            record.user.email!,
            true
          );

          incrementEmailCounter('welcome');
          results.sent++;
        } else {
          throw new Error(emailResult.error?.message || 'Unknown error');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        await db
          .update(emailQueue)
          .set({
            attempts: record.queue.attempts + 1,
            lastError: errorMessage,
            failedAt:
              record.queue.attempts + 1 >= record.queue.maxAttempts
                ? new Date()
                : null,
            updatedAt: new Date(),
          })
          .where(eq(emailQueue.id, record.queue.id));

        await logEmailResult(
          record.queue.userId,
          'welcome',
          'Welcome to MySetlist',
          record.user.email!,
          false,
          errorMessage
        );

        results.failed++;
        results.errors.push(`Welcome email for ${record.user.email}: ${errorMessage}`);
      }
    }
  } catch (error) {
    results.errors.push(`Welcome emails processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return results;
}

// Process show reminder emails
async function processShowReminderEmails(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    if (!canSendEmail('REMINDER_EMAILS_PER_HOUR')) {
      return results;
    }

    // Get queued show reminder emails
    const queuedReminders = await db
      .select({
        queue: emailQueue,
        user: users,
      })
      .from(emailQueue)
      .innerJoin(users, eq(users.id, emailQueue.userId))
      .where(
        and(
          eq(emailQueue.emailType, 'show_reminder'),
          lte(emailQueue.scheduledFor, new Date()),
          isNull(emailQueue.sentAt),
          isNull(emailQueue.failedAt),
          lt(emailQueue.attempts, emailQueue.maxAttempts)
        )
      )
      .limit(EMAIL_RATE_LIMITS.MAX_BATCH_SIZE);

    for (const record of queuedReminders) {
      if (!canSendEmail('REMINDER_EMAILS_PER_HOUR')) break;

      results.processed++;

      try {
        // Check preferences and unsubscribe status
        const [canSend, isUnsubscribed] = await Promise.all([
          checkUserEmailPreferences(record.queue.userId, 'show_reminder'),
          checkUnsubscribeStatus(record.queue.userId, 'show_reminders'),
        ]);

        if (!canSend || isUnsubscribed) {
          await db
            .update(emailQueue)
            .set({ sentAt: new Date(), updatedAt: new Date() })
            .where(eq(emailQueue.id, record.queue.id));
          continue;
        }

        // Parse email data
        const emailData = record.queue.emailData
          ? JSON.parse(record.queue.emailData)
          : {};

        const emailResult = await sendShowReminderEmail({
          to: [
            {
              email: record.user.email!,
              name: record.user.displayName || 'there',
            },
          ],
          userName: record.user.displayName || 'there',
          show: emailData.show,
          daysUntilShow: emailData.daysUntilShow || 0,
          appUrl: process.env['NEXT_PUBLIC_APP_URL'] || 'https://mysetlist.app',
        });

        if (emailResult.success) {
          await db
            .update(emailQueue)
            .set({ sentAt: new Date(), updatedAt: new Date() })
            .where(eq(emailQueue.id, record.queue.id));

          await logEmailResult(
            record.queue.userId,
            'show_reminder',
            `Show reminder: ${emailData.show?.name || 'Upcoming Show'}`,
            record.user.email!,
            true
          );

          incrementEmailCounter('reminder');
          results.sent++;
        } else {
          throw new Error(emailResult.error?.message || 'Unknown error');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await db
          .update(emailQueue)
          .set({
            attempts: record.queue.attempts + 1,
            lastError: errorMessage,
            failedAt:
              record.queue.attempts + 1 >= record.queue.maxAttempts
                ? new Date()
                : null,
            updatedAt: new Date(),
          })
          .where(eq(emailQueue.id, record.queue.id));

        await logEmailResult(
          record.queue.userId,
          'show_reminder',
          'Show Reminder',
          record.user.email!,
          false,
          errorMessage
        );

        results.failed++;
        results.errors.push(`Show reminder for ${record.user.email}: ${errorMessage}`);
      }
    }
  } catch (error) {
    results.errors.push(`Show reminders processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return results;
}

// Process new show notification emails
async function processNewShowNotifications(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    if (!canSendEmail('MARKETING_EMAILS_PER_HOUR')) {
      return results;
    }

    // Get queued new show notifications
    const queuedNotifications = await db
      .select({
        queue: emailQueue,
        user: users,
      })
      .from(emailQueue)
      .innerJoin(users, eq(users.id, emailQueue.userId))
      .where(
        and(
          eq(emailQueue.emailType, 'new_show'),
          lte(emailQueue.scheduledFor, new Date()),
          isNull(emailQueue.sentAt),
          isNull(emailQueue.failedAt),
          lt(emailQueue.attempts, emailQueue.maxAttempts)
        )
      )
      .limit(EMAIL_RATE_LIMITS.MAX_BATCH_SIZE);

    for (const record of queuedNotifications) {
      if (!canSendEmail('MARKETING_EMAILS_PER_HOUR')) break;

      results.processed++;

      try {
        // Check preferences and unsubscribe status
        const [canSend, isUnsubscribed] = await Promise.all([
          checkUserEmailPreferences(record.queue.userId, 'new_show'),
          checkUnsubscribeStatus(record.queue.userId, 'new_shows'),
        ]);

        if (!canSend || isUnsubscribed) {
          await db
            .update(emailQueue)
            .set({ sentAt: new Date(), updatedAt: new Date() })
            .where(eq(emailQueue.id, record.queue.id));
          continue;
        }

        // Parse email data
        const emailData = record.queue.emailData
          ? JSON.parse(record.queue.emailData)
          : {};

        const emailResult = await sendNewShowNotificationEmail({
          to: [
            {
              email: record.user.email!,
              name: record.user.displayName || 'there',
            },
          ],
          userName: record.user.displayName || 'there',
          show: emailData.show,
          appUrl: process.env['NEXT_PUBLIC_APP_URL'] || 'https://mysetlist.app',
        });

        if (emailResult.success) {
          await db
            .update(emailQueue)
            .set({ sentAt: new Date(), updatedAt: new Date() })
            .where(eq(emailQueue.id, record.queue.id));

          await logEmailResult(
            record.queue.userId,
            'new_show',
            `New Show: ${emailData.show?.artistName || 'Artist'} - ${emailData.show?.name || 'Show'}`,
            record.user.email!,
            true
          );

          incrementEmailCounter('marketing');
          results.sent++;
        } else {
          throw new Error(emailResult.error?.message || 'Unknown error');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await db
          .update(emailQueue)
          .set({
            attempts: record.queue.attempts + 1,
            lastError: errorMessage,
            failedAt:
              record.queue.attempts + 1 >= record.queue.maxAttempts
                ? new Date()
                : null,
            updatedAt: new Date(),
          })
          .where(eq(emailQueue.id, record.queue.id));

        await logEmailResult(
          record.queue.userId,
          'new_show',
          'New Show Notification',
          record.user.email!,
          false,
          errorMessage
        );

        results.failed++;
        results.errors.push(`New show notification for ${record.user.email}: ${errorMessage}`);
      }
    }
  } catch (error) {
    results.errors.push(`New show notifications processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return results;
}

// Process weekly digest emails
async function processWeeklyDigestEmails(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    if (!canSendEmail('WEEKLY_DIGEST_PER_HOUR')) {
      return results;
    }

    // Get queued weekly digest emails
    const queuedDigests = await db
      .select({
        queue: emailQueue,
        user: users,
      })
      .from(emailQueue)
      .innerJoin(users, eq(users.id, emailQueue.userId))
      .where(
        and(
          eq(emailQueue.emailType, 'weekly_digest'),
          lte(emailQueue.scheduledFor, new Date()),
          isNull(emailQueue.sentAt),
          isNull(emailQueue.failedAt),
          lt(emailQueue.attempts, emailQueue.maxAttempts)
        )
      )
      .limit(EMAIL_RATE_LIMITS.MAX_BATCH_SIZE);

    for (const record of queuedDigests) {
      if (!canSendEmail('WEEKLY_DIGEST_PER_HOUR')) break;

      results.processed++;

      try {
        // Check preferences and unsubscribe status
        const [canSend, isUnsubscribed] = await Promise.all([
          checkUserEmailPreferences(record.queue.userId, 'weekly_digest'),
          checkUnsubscribeStatus(record.queue.userId, 'weekly_digest'),
        ]);

        if (!canSend || isUnsubscribed) {
          await db
            .update(emailQueue)
            .set({ sentAt: new Date(), updatedAt: new Date() })
            .where(eq(emailQueue.id, record.queue.id));
          continue;
        }

        // Get personalized data for digest
        const [popularArtists, upcomingShows] = await Promise.all([
          db
            .select({
              id: artists.id,
              name: artists.name,
              upcomingShows: sql<number>`(
                SELECT COUNT(*)::int FROM ${shows} 
                WHERE ${shows.headlinerArtistId} = ${artists.id} 
                AND ${shows.date} >= NOW()::date
              )`,
            })
            .from(artists)
            .orderBy(sql`${artists.trendingScore} DESC NULLS LAST`)
            .limit(5),
          
          db
            .select({
              id: shows.id,
              name: shows.name,
              date: shows.date,
              artistName: artists.name,
              venue: venues.name,
            })
            .from(shows)
            .innerJoin(artists, eq(shows.headlinerArtistId, artists.id))
            .leftJoin(venues, eq(shows.venueId, venues.id))
            .where(gte(shows.date, new Date().toISOString().split('T')[0]!))
            .orderBy(sql`${artists.trendingScore} DESC NULLS LAST`)
            .limit(10),
        ]);

        const emailResult = await sendWeeklyDigestEmail({
          to: [
            {
              email: record.user.email!,
              name: record.user.displayName || 'there',
            },
          ],
          userName: record.user.displayName || 'there',
          weekOf: new Date().toLocaleDateString(),
          followedArtists: popularArtists,
          upcomingShows: upcomingShows.slice(0, 5),
          newSetlists: upcomingShows.slice(5, 8).map(show => ({
            id: show.id,
            name: show.name,
            date: show.date,
            artistName: show.artistName,
            venue: show.venue || 'TBA',
          })),
          totalFollowedArtists: popularArtists.length,
          appUrl: process.env['NEXT_PUBLIC_APP_URL'] || 'https://mysetlist.app',
        });

        if (emailResult.success) {
          await db
            .update(emailQueue)
            .set({ sentAt: new Date(), updatedAt: new Date() })
            .where(eq(emailQueue.id, record.queue.id));

          await logEmailResult(
            record.queue.userId,
            'weekly_digest',
            'Weekly Music Digest',
            record.user.email!,
            true
          );

          incrementEmailCounter('digest');
          results.sent++;
        } else {
          throw new Error(emailResult.error?.message || 'Unknown error');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await db
          .update(emailQueue)
          .set({
            attempts: record.queue.attempts + 1,
            lastError: errorMessage,
            failedAt:
              record.queue.attempts + 1 >= record.queue.maxAttempts
                ? new Date()
                : null,
            updatedAt: new Date(),
          })
          .where(eq(emailQueue.id, record.queue.id));

        await logEmailResult(
          record.queue.userId,
          'weekly_digest',
          'Weekly Music Digest',
          record.user.email!,
          false,
          errorMessage
        );

        results.failed++;
        results.errors.push(`Weekly digest for ${record.user.email}: ${errorMessage}`);
      }
    }
  } catch (error) {
    results.errors.push(`Weekly digest processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return results;
}

// Process setlist update notifications
async function processSetlistUpdateEmails(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    if (!canSendEmail('MARKETING_EMAILS_PER_HOUR')) {
      return results;
    }

    // Get queued setlist update emails
    const queuedUpdates = await db
      .select({
        queue: emailQueue,
        user: users,
      })
      .from(emailQueue)
      .innerJoin(users, eq(users.id, emailQueue.userId))
      .where(
        and(
          eq(emailQueue.emailType, 'setlist_update'),
          lte(emailQueue.scheduledFor, new Date()),
          isNull(emailQueue.sentAt),
          isNull(emailQueue.failedAt),
          lt(emailQueue.attempts, emailQueue.maxAttempts)
        )
      )
      .limit(EMAIL_RATE_LIMITS.MAX_BATCH_SIZE);

    for (const record of queuedUpdates) {
      if (!canSendEmail('MARKETING_EMAILS_PER_HOUR')) break;

      results.processed++;

      try {
        // Check preferences and unsubscribe status
        const [canSend, isUnsubscribed] = await Promise.all([
          checkUserEmailPreferences(record.queue.userId, 'setlist_update'),
          checkUnsubscribeStatus(record.queue.userId, 'setlist_updates'),
        ]);

        if (!canSend || isUnsubscribed) {
          await db
            .update(emailQueue)
            .set({ sentAt: new Date(), updatedAt: new Date() })
            .where(eq(emailQueue.id, record.queue.id));
          continue;
        }

        // Parse email data
        const emailData = record.queue.emailData
          ? JSON.parse(record.queue.emailData)
          : {};

        const emailResult = await sendVoteMilestoneEmail({
          to: [
            {
              email: record.user.email!,
              name: record.user.displayName || 'there',
            },
          ],
          userName: record.user.displayName || 'there',
          show: emailData.show,
          song: emailData.song,
          milestone: emailData.milestone || 10,
          totalVotes: emailData.totalVotes || 0,
          appUrl: process.env['NEXT_PUBLIC_APP_URL'] || 'https://mysetlist.app',
        });

        if (emailResult.success) {
          await db
            .update(emailQueue)
            .set({ sentAt: new Date(), updatedAt: new Date() })
            .where(eq(emailQueue.id, record.queue.id));

          await logEmailResult(
            record.queue.userId,
            'setlist_update',
            `Setlist Update: ${emailData.song?.title || 'Song'} reached ${emailData.milestone || 10} votes`,
            record.user.email!,
            true
          );

          incrementEmailCounter('marketing');
          results.sent++;
        } else {
          throw new Error(emailResult.error?.message || 'Unknown error');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await db
          .update(emailQueue)
          .set({
            attempts: record.queue.attempts + 1,
            lastError: errorMessage,
            failedAt:
              record.queue.attempts + 1 >= record.queue.maxAttempts
                ? new Date()
                : null,
            updatedAt: new Date(),
          })
          .where(eq(emailQueue.id, record.queue.id));

        await logEmailResult(
          record.queue.userId,
          'setlist_update',
          'Setlist Update',
          record.user.email!,
          false,
          errorMessage
        );

        results.failed++;
        results.errors.push(`Setlist update for ${record.user.email}: ${errorMessage}`);
      }
    }
  } catch (error) {
    results.errors.push(`Setlist updates processing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return results;
}

// Clean up old processed emails and logs
async function cleanupOldEmailData(): Promise<{
  deletedLogs: number;
  deletedQueue: number;
}> {
  try {
    const [ninetyDaysAgo, sevenDaysAgo] = [
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    ];

    // Clean up old email logs (older than 90 days)
    await db
      .delete(emailLogs)
      .where(lte(emailLogs.createdAt, ninetyDaysAgo));

    // Clean up old sent/failed queue items (older than 7 days)
    await db
      .delete(emailQueue)
      .where(
        and(
          lte(emailQueue.createdAt, sevenDaysAgo),
          sql`(${emailQueue.sentAt} IS NOT NULL OR ${emailQueue.failedAt} IS NOT NULL)`
        )
      );

    return { deletedLogs: 0, deletedQueue: 0 }; // Drizzle doesn't return counts
  } catch (error) {
    console.error('Cleanup error:', error);
    return { deletedLogs: 0, deletedQueue: 0 };
  }
}

// Main email processing endpoint - handles all email operations
export async function GET(request: NextRequest) {
  // Check authorization for cron jobs
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  
  try {
    // Process all email types in parallel with rate limiting
    const [
      welcomeResults,
      reminderResults,
      newShowResults,
      digestResults,
      setlistUpdateResults,
      automationResults,
    ] = await Promise.all([
      processWelcomeEmails(),
      processShowReminderEmails(), 
      processNewShowNotifications(),
      processWeeklyDigestEmails(),
      processSetlistUpdateEmails(),
      processEmailAutomation(),
    ]);

    // Aggregate results
    const totalResults = {
      processed: 
        welcomeResults.processed +
        reminderResults.processed +
        newShowResults.processed +
        digestResults.processed +
        setlistUpdateResults.processed +
        automationResults.processed,
      sent:
        welcomeResults.sent +
        reminderResults.sent +
        newShowResults.sent +
        digestResults.sent +
        setlistUpdateResults.sent +
        automationResults.sent,
      failed:
        welcomeResults.failed +
        reminderResults.failed +
        newShowResults.failed +
        digestResults.failed +
        setlistUpdateResults.failed +
        automationResults.failed,
      errors: [
        ...welcomeResults.errors,
        ...reminderResults.errors,
        ...newShowResults.errors,
        ...digestResults.errors,
        ...setlistUpdateResults.errors,
        ...automationResults.errors,
      ],
    };

    return NextResponse.json({
      success: true,
      processing_time_ms: Date.now() - startTime,
      rate_limits: {
        current_hour: emailsSentThisHour,
        limits: EMAIL_RATE_LIMITS,
      },
      breakdown: {
        welcome_emails: welcomeResults,
        show_reminders: reminderResults,
        new_show_notifications: newShowResults,
        weekly_digests: digestResults,
        setlist_updates: setlistUpdateResults,
        automation_engine: automationResults,
      },
      totals: totalResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Email processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Manual trigger endpoint with specific actions
export async function POST(request: NextRequest) {
  // Check authorization
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action, options = {} } = await request.json();
  const startTime = Date.now();

  try {
    switch (action) {
      case 'process_welcome_emails': {
        const result = await processWelcomeEmails();
        return NextResponse.json({
          ...result,
          processing_time_ms: Date.now() - startTime,
        });
      }

      case 'process_show_reminders': {
        const result = await processShowReminderEmails();
        return NextResponse.json({
          ...result,
          processing_time_ms: Date.now() - startTime,
        });
      }

      case 'process_new_show_notifications': {
        const result = await processNewShowNotifications();
        return NextResponse.json({
          ...result,
          processing_time_ms: Date.now() - startTime,
        });
      }

      case 'process_weekly_digests': {
        const result = await processWeeklyDigestEmails();
        return NextResponse.json({
          ...result,
          processing_time_ms: Date.now() - startTime,
        });
      }

      case 'process_setlist_updates': {
        const result = await processSetlistUpdateEmails();
        return NextResponse.json({
          ...result,
          processing_time_ms: Date.now() - startTime,
        });
      }

      case 'process_automation': {
        const result = await processEmailAutomation();
        return NextResponse.json({
          ...result,
          processing_time_ms: Date.now() - startTime,
        });
      }

      case 'process_all': {
        // Same as GET endpoint but with explicit control
        const [
          welcomeResults,
          reminderResults,
          newShowResults,
          digestResults,
          setlistUpdateResults,
          automationResults,
        ] = await Promise.all([
          processWelcomeEmails(),
          processShowReminderEmails(),
          processNewShowNotifications(),
          processWeeklyDigestEmails(),
          processSetlistUpdateEmails(),
          processEmailAutomation(),
        ]);

        const totalResults = {
          processed: 
            welcomeResults.processed +
            reminderResults.processed +
            newShowResults.processed +
            digestResults.processed +
            setlistUpdateResults.processed +
            automationResults.processed,
          sent:
            welcomeResults.sent +
            reminderResults.sent +
            newShowResults.sent +
            digestResults.sent +
            setlistUpdateResults.sent +
            automationResults.sent,
          failed:
            welcomeResults.failed +
            reminderResults.failed +
            newShowResults.failed +
            digestResults.failed +
            setlistUpdateResults.failed +
            automationResults.failed,
          errors: [
            ...welcomeResults.errors,
            ...reminderResults.errors,
            ...newShowResults.errors,
            ...digestResults.errors,
            ...setlistUpdateResults.errors,
            ...automationResults.errors,
          ],
        };

        return NextResponse.json({
          success: true,
          processing_time_ms: Date.now() - startTime,
          breakdown: {
            welcome_emails: welcomeResults,
            show_reminders: reminderResults,
            new_show_notifications: newShowResults,
            weekly_digests: digestResults,
            setlist_updates: setlistUpdateResults,
            automation_engine: automationResults,
          },
          totals: totalResults,
          rate_limits: {
            current_hour: emailsSentThisHour,
            limits: EMAIL_RATE_LIMITS,
          },
          timestamp: new Date().toISOString(),
        });
      }

      case 'cleanup': {
        const cleanupResults = await cleanupOldEmailData();
        return NextResponse.json({
          success: true,
          ...cleanupResults,
          processing_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });
      }

      case 'get_status': {
        resetRateLimitsIfNeeded();
        return NextResponse.json({
          success: true,
          rate_limits: {
            current_hour: emailsSentThisHour,
            limits: EMAIL_RATE_LIMITS,
            can_send: {
              welcome: canSendEmail('WELCOME_EMAILS_PER_HOUR'),
              reminder: canSendEmail('REMINDER_EMAILS_PER_HOUR'),
              marketing: canSendEmail('MARKETING_EMAILS_PER_HOUR'),
              digest: canSendEmail('WEEKLY_DIGEST_PER_HOUR'),
            },
          },
          processing_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });
      }

      case 'reset_rate_limits': {
        emailsSentThisHour = {
          welcome: 0,
          reminder: 0,
          marketing: 0,
          digest: 0,
          total: 0,
          lastReset: Date.now(),
        };

        return NextResponse.json({
          success: true,
          message: 'Rate limits reset',
          rate_limits: emailsSentThisHour,
          processing_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: `Action '${action}' failed`,
        details: error instanceof Error ? error.message : 'Unknown error',
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}