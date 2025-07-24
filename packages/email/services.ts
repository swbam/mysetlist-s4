import { render } from '@react-email/components';
import { getResendClient } from './index';
import { keys } from './keys';

import { ArtistFollowNotificationTemplate } from './templates/artist-follow-notification';
// Import all email templates
import { ContactTemplate } from './templates/contact';
import { EmailVerificationTemplate } from './templates/email-verification';
import { LiveShowAlertTemplate } from './templates/live-show-alert';
import { NewShowNotificationTemplate } from './templates/new-show-notification';
import { PasswordResetTemplate } from './templates/password-reset';
import { SetlistUpdateTemplate } from './templates/setlist-update';
import { ShowReminderTemplate } from './templates/show-reminder';
import { VoteMilestoneTemplate } from './templates/vote-milestone';
import { WeeklyDigestTemplate } from './templates/weekly-digest';
import { WelcomeTemplate } from './templates/welcome';

// Types
export type EmailAddress = {
  email: string;
  name?: string;
};

export type BaseEmailOptions = {
  to: EmailAddress[];
  subject: string;
  replyTo?: string;
};

export type CreateEmailResponse = {
  success: boolean;
  data?: any;
  error?: Error;
};

type Show = {
  id: string;
  name: string;
  artistName: string;
  venue: string;
  date: string;
  time?: string;
  ticketUrl?: string;
  announcedAt?: string;
};

type Song = {
  title: string;
  artist?: string;
  encore?: boolean;
};

type Artist = {
  id: string;
  name: string;
  upcomingShows: number;
};

// Base email sending function
async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: BaseEmailOptions & { html: string }): Promise<CreateEmailResponse> {
  const environment = keys();

  try {
    const emailOptions: any = {
      from: environment.RESEND_FROM || 'noreply@example.com',
      to: to.map((addr) =>
        addr.name ? `${addr.name} <${addr.email}>` : addr.email
      ),
      subject,
      text: html, // Use text instead of html to match API requirements
    };
    
    // Only add replyTo if it's defined
    if (replyTo) {
      emailOptions.replyTo = replyTo;
    }

    const result = await getResendClient().emails.send(emailOptions);

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

// Contact form email
export async function sendContactEmail({
  to,
  name,
  email,
  message,
}: {
  to: EmailAddress[];
  name: string;
  email: string;
  message: string;
}) {
  const html = await render(ContactTemplate({ name, email, message }));

  return sendEmail({
    to,
    subject: `New contact form submission from ${name}`,
    html,
    replyTo: email,
  });
}

// Welcome email for new users
export async function sendWelcomeEmail({
  to,
  name,
  appUrl = 'https://MySetlist.app',
}: {
  to: EmailAddress[];
  name: string;
  appUrl?: string;
}) {
  const html = await render(WelcomeTemplate({ name, appUrl }));

  return sendEmail({
    to,
    subject: 'Welcome to MySetlist! 🎵',
    html,
  });
}

// Show reminder email
export async function sendShowReminderEmail({
  to,
  userName,
  show,
  daysUntilShow,
  appUrl = 'https://MySetlist.app',
}: {
  to: EmailAddress[];
  userName: string;
  show: Show;
  daysUntilShow: number;
  appUrl?: string;
}) {
  const html = await render(
    ShowReminderTemplate({ userName, show, appUrl, daysUntilShow })
  );

  const timeText =
    daysUntilShow === 0
      ? 'today'
      : daysUntilShow === 1
        ? 'tomorrow'
        : `in ${daysUntilShow} days`;

  return sendEmail({
    to,
    subject: `🎵 Reminder: ${show.artistName} is performing ${timeText}!`,
    html,
  });
}

// New show announcement email
export async function sendNewShowNotificationEmail({
  to,
  userName,
  show,
  appUrl = 'https://MySetlist.app',
}: {
  to: EmailAddress[];
  userName: string;
  show: Show & { announcedAt: string };
  appUrl?: string;
}) {
  const html = await render(
    NewShowNotificationTemplate({ userName, show, appUrl })
  );

  return sendEmail({
    to,
    subject: `🎵 ${show.artistName} just announced a new show!`,
    html,
  });
}

// Setlist update email
export async function sendSetlistUpdateEmail({
  to,
  userName,
  show,
  newSongs,
  totalSongs,
  updateType = 'updated',
  appUrl = 'https://MySetlist.app',
}: {
  to: EmailAddress[];
  userName: string;
  show: Show;
  newSongs: Song[];
  totalSongs: number;
  updateType?: 'new' | 'complete' | 'updated';
  appUrl?: string;
}) {
  const html = await render(
    SetlistUpdateTemplate({
      userName,
      show,
      newSongs,
      totalSongs,
      appUrl,
      updateType,
    })
  );

  const getSubjectText = () => {
    switch (updateType) {
      case 'new':
        return `🎵 New setlist: ${show.artistName} at ${show.venue}`;
      case 'complete':
        return `✅ Complete setlist: ${show.artistName} at ${show.venue}`;
      case 'updated':
        return `🔄 Setlist updated: ${show.artistName} at ${show.venue}`;
      default:
        return `🎵 Setlist update: ${show.artistName} at ${show.venue}`;
    }
  };

  return sendEmail({
    to,
    subject: getSubjectText(),
    html,
  });
}

// Weekly digest email
export async function sendWeeklyDigestEmail({
  to,
  userName,
  weekOf,
  followedArtists,
  upcomingShows,
  newSetlists,
  totalFollowedArtists,
  appUrl = 'https://MySetlist.app',
}: {
  to: EmailAddress[];
  userName: string;
  weekOf: string;
  followedArtists: Artist[];
  upcomingShows: Show[];
  newSetlists: Show[];
  totalFollowedArtists: number;
  appUrl?: string;
}) {
  const html = await render(
    WeeklyDigestTemplate({
      userName,
      weekOf,
      followedArtists,
      upcomingShows,
      newSetlists,
      appUrl,
      totalFollowedArtists,
    })
  );

  return sendEmail({
    to,
    subject: `🎵 Your weekly music digest - ${weekOf}`,
    html,
  });
}

// Password reset email
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
  expirationHours = 24,
  appUrl = 'https://MySetlist.app',
}: {
  to: EmailAddress[];
  name: string;
  resetUrl: string;
  expirationHours?: number;
  appUrl?: string;
}) {
  const html = await render(
    PasswordResetTemplate({ name, resetUrl, appUrl, expirationHours })
  );

  return sendEmail({
    to,
    subject: 'Reset your MySetlist password',
    html,
  });
}

// Email verification email
export async function sendEmailVerificationEmail({
  to,
  name,
  verificationUrl,
  expirationHours = 24,
  appUrl = 'https://MySetlist.app',
}: {
  to: EmailAddress[];
  name: string;
  verificationUrl: string;
  expirationHours?: number;
  appUrl?: string;
}) {
  const html = await render(
    EmailVerificationTemplate({
      name,
      verificationUrl,
      appUrl,
      expirationHours,
    })
  );

  return sendEmail({
    to,
    subject: 'Verify your MySetlist email address',
    html,
  });
}

// Batch email sending for notifications
export async function sendBatchEmails<T extends Record<string, any>>({
  emails,
  template,
  getSubject,
  batchSize = 50,
  delay = 1000, // 1 second delay between batches
}: {
  emails: (EmailAddress & T)[];
  template: (data: T) => string;
  getSubject: (data: T) => string;
  batchSize?: number;
  delay?: number;
}) {
  const results: Array<{ success: boolean; email: string; error?: Error }> = [];

  // Process emails in batches
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);

    const batchPromises = batch.map(async (emailData) => {
      try {
        const html = template(emailData);
        const result = await sendEmail({
          to: emailData.name 
            ? [{ email: emailData.email, name: emailData.name }]
            : [{ email: emailData.email }],
          subject: getSubject(emailData),
          html,
        });

        return {
          success: result.success,
          email: emailData.email,
          ...(result.error && { error: result.error }),
        };
      } catch (error) {
        return {
          success: false,
          email: emailData.email,
          error: error as Error,
        };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);

    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          email: batch[index]?.email || 'unknown',
          error: new Error(result.reason),
        });
      }
    });

    // Add delay between batches to avoid rate limiting
    if (i + batchSize < emails.length) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    totalSent: results.filter((r) => r.success).length,
    totalFailed: results.filter((r) => !r.success).length,
    results,
  };
}

// Artist follow notification email
export async function sendArtistFollowNotificationEmail({
  to,
  userName,
  artist,
  followerName,
  isFirstFollow = false,
  appUrl = 'https://MySetlist.app',
}: {
  to: EmailAddress[];
  userName: string;
  artist: {
    id: string;
    name: string;
    genre?: string;
    upcomingShows: number;
    recentActivity?: string;
  };
  followerName: string;
  isFirstFollow?: boolean;
  appUrl?: string;
}) {
  const html = await render(
    ArtistFollowNotificationTemplate, {
      userName,
      artist,
      followerName,
      isFirstFollow,
      appUrl,
    }
  );

  return sendEmail({
    to,
    subject: isFirstFollow
      ? `🎉 Your first follower: ${followerName}!`
      : `🎵 New follower: ${followerName}`,
    html,
  });
}

// Vote milestone notification email
export async function sendVoteMilestoneEmail({
  to,
  userName,
  show,
  song,
  milestone,
  totalVotes,
  appUrl = 'https://MySetlist.app',
}: {
  to: EmailAddress[];
  userName: string;
  show: Show;
  song: { title: string; artist?: string; votes: number; position: number };
  milestone: number;
  totalVotes: number;
  appUrl?: string;
}) {
  const html = await render(
    VoteMilestoneTemplate({
      userName,
      show,
      song,
      milestone,
      totalVotes,
      appUrl,
    })
  );

  return sendEmail({
    to,
    subject: `🎵 "${song.title}" just hit ${milestone} votes!`,
    html,
  });
}

// Live show alert email
export async function sendLiveShowAlertEmail({
  to,
  userName,
  show,
  alertType,
  appUrl = 'https://MySetlist.app',
}: {
  to: EmailAddress[];
  userName: string;
  show: Show & {
    setlistStatus: 'empty' | 'partial' | 'live' | 'complete';
    estimatedDuration?: string;
  };
  alertType: 'starting-soon' | 'live-now' | 'setlist-live';
  appUrl?: string;
}) {
  const html = await render(
    LiveShowAlertTemplate({
      userName,
      show,
      alertType,
      appUrl,
    })
  );

  const getSubject = () => {
    switch (alertType) {
      case 'starting-soon':
        return `⏰ ${show.artistName} starts in 30 minutes!`;
      case 'live-now':
        return `🔴 LIVE: ${show.artistName} just took the stage!`;
      case 'setlist-live':
        return `📝 Live setlist: ${show.artistName} at ${show.venue}`;
      default:
        return `🎵 Live update: ${show.artistName}`;
    }
  };

  return sendEmail({
    to,
    subject: getSubject(),
    html,
  });
}

// Unsubscribe token generation and validation
export function generateUnsubscribeToken(
  userId: string,
  emailType: string
): string {
  // In production, use a proper JWT or signed token
  // For now, using a simple base64 encoding
  const payload = JSON.stringify({ userId, emailType, timestamp: Date.now() });
  return Buffer.from(payload).toString('base64url');
}

export function validateUnsubscribeToken(
  token: string
): { userId: string; emailType: string } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString());

    // Check if token is not too old (e.g., 30 days)
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    if (Date.now() - payload.timestamp > maxAge) {
      return null;
    }

    return { userId: payload.userId, emailType: payload.emailType };
  } catch {
    return null;
  }
}
