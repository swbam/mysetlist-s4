import { db } from "@repo/database";
import {
  emailPreferences,
  emailQueue,
  setlistSongs,
  setlists,
  shows,
  songs,
  users,
  venues,
  votes,
} from "@repo/database";
import { addDays } from "date-fns";
import { and, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";

export async function sendShowReminders() {
  try {
    // Get shows happening tomorrow
    const tomorrow = addDays(new Date(), 1);
    const tomorrowDateString = tomorrow.toISOString().split("T")[0] as string;

    const upcomingShows = await db
      .select()
      .from(shows)
      .where(eq(shows.date, tomorrowDateString));

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
        and(eq(emailPreferences.showReminders, true), isNotNull(users.email)),
      );

    let sent = 0;

    // Queue reminder emails
    for (const show of upcomingShows) {
      for (const user of usersWithReminders) {
        await db.insert(emailQueue).values({
          userId: user.userId,
          emailType: "show_reminder",
          emailData: JSON.stringify({
            userName: user.displayName || "there",
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
      error: error instanceof Error ? error.message : "Unknown error",
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
        and(eq(emailPreferences.weeklyDigest, true), isNotNull(users.email)),
      );

    let sent = 0;

    for (const user of usersWithDigest) {
      // Queue digest email
      await db.insert(emailQueue).values({
        userId: user.userId,
        emailType: "weekly_digest",
        emailData: JSON.stringify({
          userName: user.displayName || "there",
          email: user.email,
          subject: "Your MySetlist Digest",
        }),
        scheduledFor: new Date(),
      });
      sent++;
    }

    return { sent };
  } catch (error) {
    return {
      sent: 0,
      error: error instanceof Error ? error.message : "Unknown error",
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
      errors: [error instanceof Error ? error.message : "Unknown error"],
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
        and(eq(emailPreferences.weeklyDigest, true), isNotNull(users.email)),
      );

    let sent = 0;

    for (const user of usersWithWeeklyDigest) {
      await db.insert(emailQueue).values({
        userId: user.userId,
        emailType: "weekly_digest",
        emailData: JSON.stringify({
          userName: user.displayName || "there",
          email: user.email,
          subject: "Your Weekly MySetlist Digest",
        }),
        scheduledFor: new Date(),
      });
      sent++;
    }

    return { sent, errors: [] };
  } catch (error) {
    return {
      sent: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
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
          lte(emailQueue.scheduledFor, new Date()),
        ),
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
          `Email ${email.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );

        // Mark as failed
        await db
          .update(emailQueue)
          .set({
            failedAt: new Date(),
            lastError: error instanceof Error ? error.message : "Unknown error",
            updatedAt: new Date(),
          })
          .where(eq(emailQueue.id, email.id));
      }
    }

    return { processed, errors };
  } catch (error) {
    return {
      processed: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

export async function checkVoteMilestones(setlistSongId: string) {
  try {
    // Get vote count for the song
    const voteCount = await db
      .select({
        upvotes: sql<number>`COUNT(*)`,
      })
      .from(votes)
      .where(eq(votes.setlistSongId, setlistSongId))
      .execute();

    const { upvotes = 0 } = voteCount[0] || {};
    const totalVotes = Number(upvotes);

    // Check for milestones (10, 25, 50, 100, etc.)
    const milestones = [10, 25, 50, 100, 250, 500, 1000];
    const milestone = milestones.find((m) => totalVotes === m);

    if (!milestone) return { milestone: null };

    // Get song and show details
    // Get song and show details
    const songDetails = await db
      .select({
        songTitle: songs.title,
        artistName: songs.artist,
        showId: setlists.showId,
        showName: shows.name,
        showDate: shows.date,
        venueName: venues.name,
      })
      .from(setlistSongs)
      .innerJoin(setlists, eq(setlistSongs.setlistId, setlists.id))
      .innerJoin(shows, eq(setlists.showId, shows.id))
      .innerJoin(songs, eq(setlistSongs.songId, songs.id))
      .leftJoin(venues, eq(shows.venueId, venues.id))
      .where(eq(setlistSongs.id, setlistSongId))
      .limit(1);

    if (!songDetails[0]) return { milestone: null };

    const details = songDetails[0];

    // Get users who want vote milestone notifications
    const usersToNotify = await db
      .select({
        userId: emailPreferences.userId,
        email: users.email,
        displayName: users.displayName,
      })
      .from(emailPreferences)
      .innerJoin(users, eq(emailPreferences.userId, users.id))
      .where(
        and(
          // eq(emailPreferences.voteMilestones, true), // TODO: Add voteMilestones field to email_preferences table
          eq(emailPreferences.emailEnabled, true), // Use general email preference for now
          isNotNull(users.email),
        ),
      );

    // Queue milestone emails
    for (const user of usersToNotify) {
      await db.insert(emailQueue).values({
        userId: user.userId,
        emailType: "setlist_update", // Using setlist_update type for vote milestones temporarily
        emailData: JSON.stringify({
          userName: user.displayName || "there",
          email: user.email,
          subject: `🎵 \"${details.songTitle}\" reached ${milestone} votes!`,
          show: {
            id: details.showId,
            name: details.showName,
            artistName: details.artistName,
            venue: details.venueName || "TBA",
            date: details.showDate,
          },
          song: {
            title: details.songTitle,
            artist: details.artistName,
            votes: totalVotes,
            position: 1, // You might want to calculate actual position
          },
          milestone,
          totalVotes,
        }),
        scheduledFor: new Date(),
      });
    }

    return { milestone, notified: usersToNotify.length };
  } catch (error) {
    console.error("Failed to check vote milestones:", error);
    return {
      milestone: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
