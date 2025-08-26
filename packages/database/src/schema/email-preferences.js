"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailLogs = exports.emailQueue = exports.emailUnsubscribes = exports.emailPreferences = exports.emailStatusEnum = exports.queuedEmailTypeEnum = exports.emailTypeEnum = exports.emailFrequencyEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
exports.emailFrequencyEnum = (0, pg_core_1.pgEnum)("email_frequency", [
    "immediately",
    "daily",
    "weekly",
    "never",
]);
exports.emailTypeEnum = (0, pg_core_1.pgEnum)("email_type", [
    "show_reminders",
    "new_shows",
    "setlist_updates",
    "weekly_digest",
    "marketing",
    "all",
]);
exports.queuedEmailTypeEnum = (0, pg_core_1.pgEnum)("queued_email_type", [
    "welcome",
    "show_reminder",
    "new_show",
    "setlist_update",
    "weekly_digest",
    "password_reset",
    "email_verification",
]);
exports.emailStatusEnum = (0, pg_core_1.pgEnum)("email_status", [
    "queued",
    "sent",
    "delivered",
    "bounced",
    "failed",
    "spam",
]);
exports.emailPreferences = (0, pg_core_1.pgTable)("email_preferences", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id")
        .references(() => users_1.users.id, { onDelete: "cascade" })
        .notNull(),
    // General email preferences
    emailEnabled: (0, pg_core_1.boolean)("email_enabled").default(true).notNull(),
    // Show notifications
    showReminders: (0, pg_core_1.boolean)("show_reminders").default(true).notNull(),
    showReminderFrequency: (0, exports.emailFrequencyEnum)("show_reminder_frequency")
        .default("daily")
        .notNull(),
    // New show announcements
    newShowNotifications: (0, pg_core_1.boolean)("new_show_notifications")
        .default(true)
        .notNull(),
    newShowFrequency: (0, exports.emailFrequencyEnum)("new_show_frequency")
        .default("immediately")
        .notNull(),
    // Setlist updates
    setlistUpdates: (0, pg_core_1.boolean)("setlist_updates").default(true).notNull(),
    setlistUpdateFrequency: (0, exports.emailFrequencyEnum)("setlist_update_frequency")
        .default("immediately")
        .notNull(),
    // Weekly digest
    weeklyDigest: (0, pg_core_1.boolean)("weekly_digest").default(true).notNull(),
    // Marketing and promotional emails
    marketingEmails: (0, pg_core_1.boolean)("marketing_emails").default(false).notNull(),
    // Security and account emails (cannot be disabled)
    securityEmails: (0, pg_core_1.boolean)("security_emails").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    uniqueUserPreferences: (0, pg_core_1.unique)().on(table.userId),
}));
exports.emailUnsubscribes = (0, pg_core_1.pgTable)("email_unsubscribes", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id")
        .references(() => users_1.users.id, { onDelete: "cascade" })
        .notNull(),
    emailType: (0, exports.emailTypeEnum)("email_type").notNull(),
    unsubscribedAt: (0, pg_core_1.timestamp)("unsubscribed_at").defaultNow().notNull(),
    token: (0, pg_core_1.text)("token").notNull(), // For unsubscribe link validation
}, (table) => ({
    uniqueUserEmailType: (0, pg_core_1.unique)().on(table.userId, table.emailType),
}));
exports.emailQueue = (0, pg_core_1.pgTable)("email_queue", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id")
        .references(() => users_1.users.id, { onDelete: "cascade" })
        .notNull(),
    emailType: (0, exports.queuedEmailTypeEnum)("email_type").notNull(),
    // Email data stored as JSON
    emailData: (0, pg_core_1.text)("email_data"), // JSON string with email template data
    // Scheduling
    scheduledFor: (0, pg_core_1.timestamp)("scheduled_for").notNull(),
    sentAt: (0, pg_core_1.timestamp)("sent_at"),
    failedAt: (0, pg_core_1.timestamp)("failed_at"),
    attempts: (0, pg_core_1.integer)("attempts").default(0).notNull(),
    maxAttempts: (0, pg_core_1.integer)("max_attempts").default(3).notNull(),
    // Error tracking
    lastError: (0, pg_core_1.text)("last_error"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.emailLogs = (0, pg_core_1.pgTable)("email_logs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").references(() => users_1.users.id, { onDelete: "cascade" }),
    emailType: (0, pg_core_1.text)("email_type").notNull(),
    // Email details
    subject: (0, pg_core_1.text)("subject").notNull(),
    recipient: (0, pg_core_1.text)("recipient").notNull(), // Email address
    // Status tracking
    status: (0, exports.emailStatusEnum)("status").default("queued").notNull(),
    // External service data
    resendId: (0, pg_core_1.text)("resend_id"), // Resend email ID for tracking
    // Timestamps
    sentAt: (0, pg_core_1.timestamp)("sent_at"),
    deliveredAt: (0, pg_core_1.timestamp)("delivered_at"),
    openedAt: (0, pg_core_1.timestamp)("opened_at"),
    clickedAt: (0, pg_core_1.timestamp)("clicked_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
