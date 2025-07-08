import {
  queueEmail,
  sendWelcomeEmailAction,
} from '@/actions/email-notifications';
import { db } from '@repo/database';
import { users } from '@repo/database/src/schema';
import { eq } from 'drizzle-orm';

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
// Note: This functionality is currently disabled since user follows have been removed
export async function triggerNewShowNotifications(showId: string) {
  console.log(
    `New show notification trigger disabled for show ${showId} - user follows not available`
  );
  return;
}

// Trigger setlist update notifications
// Note: This functionality is currently disabled since user follows have been removed
export async function triggerSetlistUpdateNotifications(
  showId: string,
  newSongs: Array<{ title: string; artist?: string; encore?: boolean }>,
  updateType: 'new' | 'complete' | 'updated' = 'updated'
) {
  console.log(
    `Setlist update notification trigger disabled for show ${showId} - user follows not available`
  );
  return;
}

// Trigger email verification
export async function triggerEmailVerification(
  userId: string,
  verificationToken: string
) {
  try {
    const user = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      console.error(`User ${userId} not found`);
      return;
    }

    const appUrl =
      process.env['NEXT_PUBLIC_APP_URL'] || 'https://MySetlist.app';
    const verificationUrl = `${appUrl}/auth/verify?token=${verificationToken}`;

    await queueEmail({
      userId,
      emailType: 'email_verification',
      emailData: {
        name: 'Music Lover',
        verificationUrl,
        expirationHours: 24,
      },
      scheduledFor: new Date(), // Send immediately
    });

    console.log(`Email verification queued for user ${userId}`);
  } catch (error) {
    console.error(
      `Failed to trigger email verification for user ${userId}:`,
      error
    );
  }
}

// Trigger password reset email
export async function triggerPasswordReset(userId: string, resetToken: string) {
  try {
    const user = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      console.error(`User ${userId} not found`);
      return;
    }

    const appUrl =
      process.env['NEXT_PUBLIC_APP_URL'] || 'https://MySetlist.app';
    const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}`;

    await queueEmail({
      userId,
      emailType: 'password_reset',
      emailData: {
        name: 'Music Lover',
        resetUrl,
        expirationHours: 24,
      },
      scheduledFor: new Date(), // Send immediately
    });

    console.log(`Password reset email queued for user ${userId}`);
  } catch (error) {
    console.error(
      `Failed to trigger password reset for user ${userId}:`,
      error
    );
  }
}
