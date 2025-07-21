import { eq, sql } from 'drizzle-orm';
import { db } from '../client';
import { emailPreferences, users } from '../schema';

export async function getUserById(userId: string) {
  const result = await db
    .select({
      user: users,
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
      totalVotes: sql<number>`(
        SELECT COUNT(*)
        FROM votes
        WHERE user_id = ${userId}
      )`,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return (
    stats[0] || {
      totalVotes: 0,
    }
  );
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
