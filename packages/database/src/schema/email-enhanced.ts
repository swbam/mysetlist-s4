import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { artists } from './artists';
import { shows } from './shows';
import { users } from './users';

// Email template types
export const emailTemplateTypeEnum = pgEnum('email_template_type', [
  'welcome',
  'show_reminder',
  'new_show',
  'setlist_update',
  'weekly_digest',
  'monthly_digest',
  'artist_update',
  'password_reset',
  'email_verification',
  'account_deletion',
  'marketing',
  'transactional',
  'notification',
]);

// Email channel types
export const emailChannelEnum = pgEnum('email_channel', [
  'email',
  'push',
  'sms',
  'in_app',
]);

// Email priority levels
export const emailPriorityEnum = pgEnum('email_priority', [
  'low',
  'normal',
  'high',
  'urgent',
]);

// Email templates
export const emailTemplates = pgTable(
  'email_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    type: emailTemplateTypeEnum('type').notNull(),
    subject: text('subject').notNull(),
    htmlTemplate: text('html_template').notNull(),
    textTemplate: text('text_template'),
    mjmlTemplate: text('mjml_template'), // For MJML templates
    variables: jsonb('variables'), // Required variables for template
    metadata: jsonb('metadata'),
    isActive: boolean('is_active').default(true),
    version: integer('version').default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index('idx_email_templates_type').on(table.type),
    activeIdx: index('idx_email_templates_active').on(table.isActive),
  })
);

// Enhanced email queue with batching support
export const emailQueueEnhanced = pgTable(
  'email_queue_enhanced',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    batchId: uuid('batch_id'),
    userId: uuid('user_id').references(() => users.id),
    recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
    templateId: uuid('template_id')
      .references(() => emailTemplates.id)
      .notNull(),
    channel: emailChannelEnum('channel').default('email').notNull(),
    priority: emailPriorityEnum('priority').default('normal').notNull(),

    // Dynamic data for template
    templateData: jsonb('template_data'),

    // Scheduling
    scheduledFor: timestamp('scheduled_for').notNull(),
    sendAfter: timestamp('send_after'),
    sendBefore: timestamp('send_before'),

    // Processing
    processingStartedAt: timestamp('processing_started_at'),
    sentAt: timestamp('sent_at'),
    deliveredAt: timestamp('delivered_at'),
    openedAt: timestamp('opened_at'),
    clickedAt: timestamp('clicked_at'),
    bouncedAt: timestamp('bounced_at'),
    complainedAt: timestamp('complained_at'),

    // Status tracking
    status: varchar('status', { length: 20 }).default('queued').notNull(),
    attempts: integer('attempts').default(0),
    maxAttempts: integer('max_attempts').default(3),
    lastError: text('last_error'),

    // Provider info
    providerId: varchar('provider_id', { length: 100 }), // Resend/SendGrid ID
    providerResponse: jsonb('provider_response'),

    // Metadata
    tags: jsonb('tags'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    scheduledIdx: index('idx_email_queue_enh_scheduled').on(
      table.scheduledFor,
      table.status
    ),
    statusIdx: index('idx_email_queue_enh_status').on(table.status),
    batchIdx: index('idx_email_queue_enh_batch').on(table.batchId),
    userIdx: index('idx_email_queue_enh_user').on(table.userId),
    priorityIdx: index('idx_email_queue_enh_priority').on(
      table.priority,
      table.scheduledFor
    ),
  })
);

// Email batches for bulk sending
export const emailBatches = pgTable(
  'email_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    templateId: uuid('template_id')
      .references(() => emailTemplates.id)
      .notNull(),
    totalRecipients: integer('total_recipients').default(0),
    sent: integer('sent').default(0),
    delivered: integer('delivered').default(0),
    opened: integer('opened').default(0),
    clicked: integer('clicked').default(0),
    bounced: integer('bounced').default(0),
    complained: integer('complained').default(0),
    status: varchar('status', { length: 20 }).default('draft').notNull(),
    scheduledFor: timestamp('scheduled_for'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index('idx_email_batches_status').on(table.status),
    createdIdx: index('idx_email_batches_created').on(table.createdAt),
  })
);

// User notification preferences (enhanced)
export const userNotificationPreferences = pgTable(
  'user_notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull()
      .unique(),

    // Global settings
    globalEmailEnabled: boolean('global_email_enabled').default(true),
    globalPushEnabled: boolean('global_push_enabled').default(true),
    globalSmsEnabled: boolean('global_sms_enabled').default(false),

    // Quiet hours
    quietHoursEnabled: boolean('quiet_hours_enabled').default(false),
    quietHoursStart: varchar('quiet_hours_start', { length: 5 }), // HH:MM format
    quietHoursEnd: varchar('quiet_hours_end', { length: 5 }), // HH:MM format
    timezone: varchar('timezone', { length: 50 }).default('UTC'),

    // Frequency limits
    maxDailyEmails: integer('max_daily_emails').default(10),
    maxWeeklyEmails: integer('max_weekly_emails').default(50),

    // Preferences by category
    preferences: jsonb('preferences').notNull().default('{}'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('idx_notification_prefs_user').on(table.userId),
  })
);

// Notification categories
export const notificationCategories = pgTable('notification_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  defaultChannels: jsonb('default_channels').notNull().default('["email"]'),
  isOptional: boolean('is_optional').default(true),
  priority: emailPriorityEnum('priority').default('normal'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Digest email content aggregation
export const digestContent = pgTable(
  'digest_content',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    digestType: varchar('digest_type', { length: 20 }).notNull(), // weekly, monthly
    contentType: varchar('content_type', { length: 50 }).notNull(),
    contentId: uuid('content_id').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    imageUrl: text('image_url'),
    actionUrl: text('action_url'),
    priority: integer('priority').default(0),
    metadata: jsonb('metadata'),
    scheduledFor: timestamp('scheduled_for').notNull(),
    includedInDigest: boolean('included_in_digest').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userDigestIdx: index('idx_digest_content_user').on(
      table.userId,
      table.digestType,
      table.scheduledFor
    ),
    includedIdx: index('idx_digest_content_included').on(
      table.includedInDigest
    ),
  })
);

// Email engagement tracking
export const emailEngagement = pgTable(
  'email_engagement',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    emailId: uuid('email_id').notNull(), // References email_queue_enhanced
    userId: uuid('user_id').references(() => users.id),
    action: varchar('action', { length: 20 }).notNull(), // open, click, unsubscribe, spam
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    clickedUrl: text('clicked_url'),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    emailIdx: index('idx_email_engagement_email').on(table.emailId),
    userIdx: index('idx_email_engagement_user').on(table.userId),
    actionIdx: index('idx_email_engagement_action').on(table.action),
    timestampIdx: index('idx_email_engagement_timestamp').on(table.timestamp),
  })
);

// Transactional email logs
export const transactionalEmails = pgTable(
  'transactional_emails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id),
    recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    subject: text('subject').notNull(),
    providerId: varchar('provider_id', { length: 100 }),
    status: varchar('status', { length: 20 }).notNull(),
    sentAt: timestamp('sent_at').defaultNow().notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    userIdx: index('idx_transactional_user').on(table.userId),
    typeIdx: index('idx_transactional_type').on(table.type),
    sentIdx: index('idx_transactional_sent').on(table.sentAt),
  })
);

// Artist update subscriptions
export const artistUpdateSubscriptions = pgTable(
  'artist_update_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    artistId: uuid('artist_id')
      .references(() => artists.id)
      .notNull(),
    newShows: boolean('new_shows').default(true),
    setlistUpdates: boolean('setlist_updates').default(true),
    artistNews: boolean('artist_news').default(true),
    frequency: emailChannelEnum('frequency').default('email').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userArtistIdx: index('idx_artist_subs').on(table.userId, table.artistId),
    pk: primaryKey({ columns: [table.userId, table.artistId] }),
  })
);

// Show reminder subscriptions
export const showReminderSubscriptions = pgTable(
  'show_reminder_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    showId: uuid('show_id')
      .references(() => shows.id)
      .notNull(),
    reminderDaysBefore: integer('reminder_days_before').default(1),
    reminderSent: boolean('reminder_sent').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userShowIdx: index('idx_show_reminders').on(table.userId, table.showId),
    sentIdx: index('idx_show_reminders_sent').on(table.reminderSent),
    pk: primaryKey({ columns: [table.userId, table.showId] }),
  })
);
