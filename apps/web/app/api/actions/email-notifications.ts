import { db } from '@repo/database';
import { emailQueue, shows, emailPreferences, users } from '@repo/database';
import { addDays } from 'date-fns';
import { and, eq, isNotNull, isNull, lte } from 'drizzle-orm';

export async function sendShowReminders() {
  try {
    // Get shows happening tomorrow
    const tomorrow = addDays(new Date(), 1);
    const tomorrowDateString = tomorrow.toISOString().split('T')[0] as string;

    const upcomingShows = await db
      .select()
      .from(shows)
      .where(
        eq(shows.date, tomorrowDateString)
      );

    // Get users who want reminders
    const usersWithReminders = await db
      .select({
        userId: emailPreferences.userId,
        email: users.email,
        displayName: users.displayName,
      })
      .from(emailPreferences)
      .innerJoin(users, eq(emailPreferences.userId, users.id))
      .where(
        and(eq(emailPreferences.showReminders, true), isNotNull(users.email))
      );

    let sent = 0;

    // Queue reminder emails
    for (const show of upcomingShows) {
      for (const user of usersWithReminders) {
        await db.insert(emailQueue).values({
          userId: user.userId,
          emailType: 'show_reminder',
          emailData: JSON.stringify({
            userName: user.displayName || 'there',
            showId: show.id,
            email: user.email,
            subject: `Reminder: Show tomorrow`,
          }),
          scheduledFor: new Date(),
        });
        sent++;
      }
    }

    return { sent };
  } catch (error) {
    return {
      sent: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendDigestEmails() {
  try {

    // Get users who want digest emails
    const usersWithDigest = await db
      .select({
        userId: emailPreferences.userId,
        email: users.email,
        displayName: users.displayName,
        weeklyDigest: emailPreferences.weeklyDigest,
      })
      .from(emailPreferences)
      .innerJoin(users, eq(emailPreferences.userId, users.id))
      .where(
        and(eq(emailPreferences.weeklyDigest, true), isNotNull(users.email))
      );

    let sent = 0;

    for (const user of usersWithDigest) {
      // Queue digest email
      await db.insert(emailQueue).values({
        userId: user.userId,
        emailType: 'weekly_digest',
        emailData: JSON.stringify({
          userName: user.displayName || 'there',
          email: user.email,
          subject: 'Your MySetlist Digest',
        }),
        scheduledFor: new Date(),
      });
      sent++;
    }

    return { sent };
  } catch (error) {
    return {
      sent: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendDailyShowReminders() {
  try {
    const result = await sendShowReminders();
    return { sent: result.sent, errors: result.error ? [result.error] : [] };
  } catch (error) {
    return {
      sent: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

export async function sendWeeklyDigests() {
  try {
    // Only send to users with weekly digest preference
    const usersWithWeeklyDigest = await db
      .select({
        userId: emailPreferences.userId,
        email: users.email,
        displayName: users.displayName,
      })
      .from(emailPreferences)
      .innerJoin(users, eq(emailPreferences.userId, users.id))
      .where(
        and(
          eq(emailPreferences.weeklyDigest, true),
          isNotNull(users.email)
        )
      );

    let sent = 0;

    for (const user of usersWithWeeklyDigest) {
      await db.insert(emailQueue).values({
        userId: user.userId,
        emailType: 'weekly_digest',
        emailData: JSON.stringify({
          userName: user.displayName || 'there',
          email: user.email,
          subject: 'Your Weekly MySetlist Digest',
        }),
        scheduledFor: new Date(),
      });
      sent++;
    }

    return { sent, errors: [] };
  } catch (error) {
    return {
      sent: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

export async function processQueuedEmails() {
  try {
    // Get pending emails
    const pendingEmails = await db
      .select()
      .from(emailQueue)
      .where(
        and(
          isNull(emailQueue.sentAt),
          lte(emailQueue.scheduledFor, new Date())
        )
      )
      .limit(50); // Process in batches

    let processed = 0;
    const errors: string[] = [];

    for (const email of pendingEmails) {
      try {
        await db
          .update(emailQueue)
          .set({
            sentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(emailQueue.id, email.id));

        processed++;
      } catch (error) {
        errors.push(
          `Email ${email.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );

        // Mark as failed
        await db
          .update(emailQueue)
          .set({
            failedAt: new Date(),
            lastError: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date(),
          })
          .where(eq(emailQueue.id, email.id));
      }
    }

    return { processed, errors };
  } catch (error) {
    return {
      processed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
