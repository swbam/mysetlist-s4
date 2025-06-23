-- Email notification system tables

-- Create email frequency enum
CREATE TYPE "email_frequency" AS ENUM ('immediately', 'daily', 'weekly', 'never');

-- Create email type enum for unsubscribes
CREATE TYPE "email_type" AS ENUM ('show_reminders', 'new_shows', 'setlist_updates', 'weekly_digest', 'marketing', 'all');

-- Create queued email type enum
CREATE TYPE "queued_email_type" AS ENUM ('welcome', 'show_reminder', 'new_show', 'setlist_update', 'weekly_digest', 'password_reset', 'email_verification');

-- Create email status enum
CREATE TYPE "email_status" AS ENUM ('queued', 'sent', 'delivered', 'bounced', 'failed', 'spam');

-- Email preferences table
CREATE TABLE "email_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "email_enabled" BOOLEAN NOT NULL DEFAULT true,
  "show_reminders" BOOLEAN NOT NULL DEFAULT true,
  "show_reminder_frequency" "email_frequency" NOT NULL DEFAULT 'daily',
  "new_show_notifications" BOOLEAN NOT NULL DEFAULT true,
  "new_show_frequency" "email_frequency" NOT NULL DEFAULT 'immediately',
  "setlist_updates" BOOLEAN NOT NULL DEFAULT true,
  "setlist_update_frequency" "email_frequency" NOT NULL DEFAULT 'immediately',
  "weekly_digest" BOOLEAN NOT NULL DEFAULT true,
  "marketing_emails" BOOLEAN NOT NULL DEFAULT false,
  "security_emails" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("user_id")
);

-- Email unsubscribes table
CREATE TABLE "email_unsubscribes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "email_type" "email_type" NOT NULL,
  "unsubscribed_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "token" TEXT NOT NULL,
  UNIQUE("user_id", "email_type")
);

-- Email queue table for scheduled emails
CREATE TABLE "email_queue" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "email_type" "queued_email_type" NOT NULL,
  "email_data" TEXT, -- JSON string with email template data
  "scheduled_for" TIMESTAMP NOT NULL,
  "sent_at" TIMESTAMP,
  "failed_at" TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "last_error" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Email logs table for tracking sent emails
CREATE TABLE "email_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
  "email_type" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "status" "email_status" NOT NULL DEFAULT 'queued',
  "resend_id" TEXT, -- Resend email ID for tracking
  "sent_at" TIMESTAMP,
  "delivered_at" TIMESTAMP,
  "opened_at" TIMESTAMP,
  "clicked_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX "idx_email_preferences_user_id" ON "email_preferences"("user_id");
CREATE INDEX "idx_email_unsubscribes_user_id" ON "email_unsubscribes"("user_id");
CREATE INDEX "idx_email_unsubscribes_token" ON "email_unsubscribes"("token");
CREATE INDEX "idx_email_queue_scheduled_for" ON "email_queue"("scheduled_for");
CREATE INDEX "idx_email_queue_user_id" ON "email_queue"("user_id");
CREATE INDEX "idx_email_queue_status" ON "email_queue"("sent_at", "failed_at");
CREATE INDEX "idx_email_logs_user_id" ON "email_logs"("user_id");
CREATE INDEX "idx_email_logs_status" ON "email_logs"("status");
CREATE INDEX "idx_email_logs_created_at" ON "email_logs"("created_at");
CREATE INDEX "idx_email_logs_resend_id" ON "email_logs"("resend_id");

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_email_preferences_updated_at BEFORE UPDATE ON "email_preferences" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_queue_updated_at BEFORE UPDATE ON "email_queue" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_logs_updated_at BEFORE UPDATE ON "email_logs" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create default email preferences for existing users
INSERT INTO "email_preferences" ("user_id", "email_enabled", "show_reminders", "new_show_notifications", "setlist_updates", "weekly_digest", "marketing_emails", "security_emails")
SELECT 
  "id",
  true,
  true,
  true,
  true,
  true,
  false,
  true
FROM "users"
WHERE "deleted_at" IS NULL
ON CONFLICT ("user_id") DO NOTHING;