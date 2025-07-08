import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const emailFrequencyEnum = pgEnum('email_frequency', [
  'immediately',
  'daily',
  'weekly',
  'never',
]);

export const emailTypeEnum = pgEnum('email_type', [
  'show_reminders',
  'new_shows',
  'setlist_updates',
  'weekly_digest',
  'marketing',
  'all',
]);

export const queuedEmailTypeEnum = pgEnum('queued_email_type', [
  'welcome',
  'show_reminder',
  'new_show',
  'setlist_update',
  'weekly_digest',
  'password_reset',
  'email_verification',
]);

export const emailStatusEnum = pgEnum('email_status', [
  'queued',
  'sent',
  'delivered',
  'bounced',
  'failed',
  'spam',
]);

export const emailPreferences = pgTable(
  'email_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),

    // General email preferences
    emailEnabled: boolean('email_enabled').default(true).notNull(),

    // Show notifications
    showReminders: boolean('show_reminders').default(true).notNull(),
    showReminderFrequency: emailFrequencyEnum('show_reminder_frequency')
      .default('daily')
      .notNull(),

    // New show announcements
    newShowNotifications: boolean('new_show_notifications')
      .default(true)
      .notNull(),
    newShowFrequency: emailFrequencyEnum('new_show_frequency')
      .default('immediately')
      .notNull(),

    // Setlist updates
    setlistUpdates: boolean('setlist_updates').default(true).notNull(),
    setlistUpdateFrequency: emailFrequencyEnum('setlist_update_frequency')
      .default('immediately')
      .notNull(),

    // Weekly digest
    weeklyDigest: boolean('weekly_digest').default(true).notNull(),

    // Marketing and promotional emails
    marketingEmails: boolean('marketing_emails').default(false).notNull(),

    // Security and account emails (cannot be disabled)
    securityEmails: boolean('security_emails').default(true).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserPreferences: unique().on(table.userId),
  })
);

export const emailUnsubscribes = pgTable(
  'email_unsubscribes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    emailType: emailTypeEnum('email_type').notNull(),
    unsubscribedAt: timestamp('unsubscribed_at').defaultNow().notNull(),
    token: text('token').notNull(), // For unsubscribe link validation
  },
  (table) => ({
    uniqueUserEmailType: unique().on(table.userId, table.emailType),
  })
);

export const emailQueue = pgTable('email_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  emailType: queuedEmailTypeEnum('email_type').notNull(),

  // Email data stored as JSON
  emailData: text('email_data'), // JSON string with email template data

  // Scheduling
  scheduledFor: timestamp('scheduled_for').notNull(),
  sentAt: timestamp('sent_at'),
  failedAt: timestamp('failed_at'),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),

  // Error tracking
  lastError: text('last_error'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const emailLogs = pgTable('email_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  emailType: text('email_type').notNull(),

  // Email details
  subject: text('subject').notNull(),
  recipient: text('recipient').notNull(), // Email address

  // Status tracking
  status: emailStatusEnum('status').default('queued').notNull(),

  // External service data
  resendId: text('resend_id'), // Resend email ID for tracking

  // Timestamps
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
