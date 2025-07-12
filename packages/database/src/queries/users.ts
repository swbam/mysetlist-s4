import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../client';
import { emailPreferences, userShowAttendance, users } from '../schema';

export async function getUserById(userId: string) {
  const result = await db
    .select({
      user: users,
      attendingShowCount: sql<number>`(
        SELECT COUNT(*)
        FROM user_show_attendance usa
        WHERE usa.user_id = ${users.id}
        AND usa.status IN ('going', 'interested')
      )`,
      hasEmailPreferences: sql<boolean>`(
        SELECT EXISTS(
          SELECT 1 FROM email_preferences ep
          WHERE ep.user_id = ${users.id}
        )
      )`,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0] || null;
}

export async function getUserByEmail(email: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0] || null;
}

export async function createUser(userData: {
  id: string;
  email: string;
}) {
  const [user] = await db
    .insert(users)
    .values({
      id: userData.id,
      email: userData.email,
    })
    .returning();

  // Create default email preferences
  if (user) {
    await db
      .insert(emailPreferences)
      .values({
        userId: user.id,
        emailEnabled: true,
        showReminders: true,
        showReminderFrequency: 'daily',
        newShowNotifications: true,
        newShowFrequency: 'immediately',
        setlistUpdates: true,
        setlistUpdateFrequency: 'immediately',
        weeklyDigest: true,
        marketingEmails: false,
        securityEmails: true,
      })
      .onConflictDoNothing();
  }

  return user;
}

export async function updateUser(
  userId: string,
  userData: {
    email?: string;
  }
) {
  const [updatedUser] = await db
    .update(users)
    .set({
      ...userData,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return updatedUser;
}

export async function getUserStats(userId: string) {
  const stats = await db
    .select({
      attendedShows: sql<number>`(
        SELECT COUNT(*)
        FROM user_show_attendance
        WHERE user_id = ${userId}
        AND status = 'going'
      )`,
      interestedShows: sql<number>`(
        SELECT COUNT(*)
        FROM user_show_attendance
        WHERE user_id = ${userId}
        AND status = 'interested'
      )`,
      totalVotes: sql<number>`(
        SELECT COUNT(*)
        FROM votes
        WHERE user_id = ${userId}
      )`,
      reviews: sql<number>`(
        SELECT COUNT(*)
        FROM venue_reviews
        WHERE user_id = ${userId}
      )`,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return (
    stats[0] || {
      attendedShows: 0,
      interestedShows: 0,
      totalVotes: 0,
      reviews: 0,
    }
  );
}

export async function getUserActivity(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const { limit = 50, offset = 0, startDate, endDate } = options || {};

  // Build all conditions upfront
  const conditions = [eq(userShowAttendance.userId, userId)];

  if (startDate) {
    conditions.push(gte(userShowAttendance.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(userShowAttendance.createdAt, endDate));
  }

  // This would need a more complex query or multiple queries to get different activity types
  // For now, returning a simplified version focusing on show attendance
  const activities = await db
    .select({
      activityType: sql<string>`'attendance'`,
      activityId: userShowAttendance.id,
      timestamp: userShowAttendance.createdAt,
      status: userShowAttendance.status,
      showId: userShowAttendance.showId,
    })
    .from(userShowAttendance)
    .where(and(...conditions))
    .orderBy(desc(userShowAttendance.createdAt))
    .limit(limit)
    .offset(offset);

  return activities;
}

export async function getUserPreferences(userId: string) {
  const prefs = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, userId))
    .limit(1);

  if (prefs.length === 0) {
    // Create default preferences if they don't exist
    const [newPrefs] = await db
      .insert(emailPreferences)
      .values({
        userId,
        emailEnabled: true,
        showReminders: true,
        showReminderFrequency: 'daily',
        newShowNotifications: true,
        newShowFrequency: 'immediately',
        setlistUpdates: true,
        setlistUpdateFrequency: 'immediately',
        weeklyDigest: true,
        marketingEmails: false,
        securityEmails: true,
      })
      .returning();

    return newPrefs;
  }

  return prefs[0];
}

export async function updateUserPreferences(
  userId: string,
  preferences: Partial<typeof emailPreferences.$inferInsert>
) {
  const [updated] = await db
    .update(emailPreferences)
    .set({
      ...preferences,
      updatedAt: new Date(),
    })
    .where(eq(emailPreferences.userId, userId))
    .returning();

  return updated;
}
