import { createClient } from '@/lib/supabase/server';
import { db } from '@repo/database';
import { emailQueue, shows, userPreferences, users } from '@repo/database';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { and, eq, gte, isNotNull, lte } from 'drizzle-orm';

export async function sendShowReminders() {
  console.log('Sending show reminders...');

  try {
    // Get shows happening tomorrow
    const tomorrow = addDays(new Date(), 1);
    const tomorrowStart = startOfDay(tomorrow);
    const tomorrowEnd = endOfDay(tomorrow);

    const upcomingShows = await db
      .select()
      .from(shows)
      .where(
        and(
          gte(shows.dateTime, tomorrowStart),
          lte(shows.dateTime, tomorrowEnd)
        )
      );

    // Get users who want reminders
    const usersWithReminders = await db
      .select({
        userId: userPreferences.userId,
        email: users.email,
        displayName: users.displayName,
      })
      .from(userPreferences)
      .innerJoin(users, eq(userPreferences.userId, users.id))
      .where(
        and(eq(userPreferences.showReminders, true), isNotNull(users.email))
      );

    let sent = 0;

    // Queue reminder emails
    for (const show of upcomingShows) {
      for (const user of usersWithReminders) {
        await db.insert(emailQueue).values({
          to: user.email!,
          subject: `Reminder: Show tomorrow at ${show.venueName}`,
          template: 'show-reminder',
          data: {
            userName: user.displayName || 'there',
            showId: show.id,
            venueName: show.venueName,
            dateTime: show.dateTime.toISOString(),
          },
          scheduledFor: new Date(),
        });
        sent++;
      }
    }

    return { sent };
  } catch (error) {
    console.error('Error sending show reminders:', error);
    return {
      sent: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendDigestEmails() {
  console.log('Sending digest emails...');

  try {
    const supabase = await createClient();

    // Get users who want digest emails
    const usersWithDigest = await db
      .select({
        userId: userPreferences.userId,
        email: users.email,
        displayName: users.displayName,
        digestFrequency: userPreferences.digestFrequency,
      })
      .from(userPreferences)
      .innerJoin(users, eq(userPreferences.userId, users.id))
      .where(
        and(isNotNull(userPreferences.digestFrequency), isNotNull(users.email))
      );

    let sent = 0;

    for (const user of usersWithDigest) {
      // Queue digest email
      await db.insert(emailQueue).values({
        to: user.email!,
        subject: 'Your MySetlist Digest',
        template: 'digest',
        data: {
          userName: user.displayName || 'there',
          userId: user.userId,
          frequency: user.digestFrequency,
        },
        scheduledFor: new Date(),
      });
      sent++;
    }

    return { sent };
  } catch (error) {
    console.error('Error sending digest emails:', error);
    return {
      sent: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendDailyShowReminders() {
  console.log('Sending daily show reminders...');

  try {
    const result = await sendShowReminders();
    return { sent: result.sent, errors: result.error ? [result.error] : [] };
  } catch (error) {
    console.error('Error in daily show reminders:', error);
    return {
      sent: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

export async function sendWeeklyDigests() {
  console.log('Sending weekly digests...');

  try {
    // Only send to users with weekly digest preference
    const usersWithWeeklyDigest = await db
      .select({
        userId: userPreferences.userId,
        email: users.email,
        displayName: users.displayName,
      })
      .from(userPreferences)
      .innerJoin(users, eq(userPreferences.userId, users.id))
      .where(
        and(
          eq(userPreferences.digestFrequency, 'weekly'),
          isNotNull(users.email)
        )
      );

    let sent = 0;

    for (const user of usersWithWeeklyDigest) {
      await db.insert(emailQueue).values({
        to: user.email!,
        subject: 'Your Weekly MySetlist Digest',
        template: 'weekly-digest',
        data: {
          userName: user.displayName || 'there',
          userId: user.userId,
        },
        scheduledFor: new Date(),
      });
      sent++;
    }

    return { sent, errors: [] };
  } catch (error) {
    console.error('Error sending weekly digests:', error);
    return {
      sent: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

export async function processQueuedEmails() {
  console.log('Processing queued emails...');

  try {
    // Get pending emails
    const pendingEmails = await db
      .select()
      .from(emailQueue)
      .where(
        and(
          eq(emailQueue.status, 'pending'),
          lte(emailQueue.scheduledFor, new Date())
        )
      )
      .limit(50); // Process in batches

    let processed = 0;
    const errors: string[] = [];

    for (const email of pendingEmails) {
      try {
        // In production, this would call an email service like SendGrid or AWS SES
        // For now, we just mark as sent
        console.log(`Would send email to ${email.to}: ${email.subject}`);

        await db
          .update(emailQueue)
          .set({
            status: 'sent',
            sentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(emailQueue.id, email.id));

        processed++;
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        errors.push(
          `Email ${email.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

        // Mark as failed
        await db
          .update(emailQueue)
          .set({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date(),
          })
          .where(eq(emailQueue.id, email.id));
      }
    }

    return { processed, errors };
  } catch (error) {
    console.error('Error processing email queue:', error);
    return {
      processed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
