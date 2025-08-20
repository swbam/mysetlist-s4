import { db } from "@repo/database";
import { users } from "@repo/database/src/schema";
import { eq } from "drizzle-orm";
import {
  queueEmail,
  sendWelcomeEmailAction,
} from "~/actions/email-notifications";

// Trigger welcome email when user signs up
export async function triggerWelcomeEmail(userId: string) {
  try {
    await sendWelcomeEmailAction(userId);
  } catch (_error) {}
}

// Trigger new show notifications when a show is created
// Note: This functionality is currently disabled since user follows have been removed
export async function triggerNewShowNotifications(_showId: string) {
  return;
}

// Trigger setlist update notifications
// Note: This functionality is currently disabled since user follows have been removed
export async function triggerSetlistUpdateNotifications(
  _showId: string,
  _newSongs: Array<{ title: string; artist?: string; encore?: boolean }>,
  _updateType: "new" | "complete" | "updated" = "updated",
) {
  return;
}

// Trigger email verification
export async function triggerEmailVerification(
  userId: string,
  verificationToken: string,
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
      return;
    }

    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || "https://theset.live";
    const verificationUrl = `${appUrl}/auth/verify?token=${verificationToken}`;

    await queueEmail({
      userId,
      emailType: "email_verification",
      emailData: {
        name: "Music Lover",
        verificationUrl,
        expirationHours: 24,
      },
      scheduledFor: new Date(), // Send immediately
    });
  } catch (_error) {}
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
      return;
    }

    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || "https://theset.live";
    const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}`;

    await queueEmail({
      userId,
      emailType: "password_reset",
      emailData: {
        name: "Music Lover",
        resetUrl,
        expirationHours: 24,
      },
      scheduledFor: new Date(), // Send immediately
    });
  } catch (_error) {}
}
