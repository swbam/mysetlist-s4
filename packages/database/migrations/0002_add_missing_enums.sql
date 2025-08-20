-- Add missing enums that are referenced but not created in previous migrations

-- Import stage enum for import status tracking
DO $$ BEGIN
  CREATE TYPE "import_stage" AS ENUM(
    'initializing',
    'syncing-identifiers', 
    'importing-songs',
    'importing-shows',
    'creating-setlists',
    'completed',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Log level enum for import logs
DO $$ BEGIN
  CREATE TYPE "log_level" AS ENUM(
    'info',
    'warning',
    'error',
    'success',
    'debug'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- System health status enum
DO $$ BEGIN
  CREATE TYPE "system_health_status" AS ENUM(
    'healthy',
    'degraded',
    'down'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Priority level enum
DO $$ BEGIN
  CREATE TYPE "priority_level" AS ENUM(
    'low',
    'medium',
    'high',
    'urgent'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Report status enum
DO $$ BEGIN
  CREATE TYPE "report_status" AS ENUM(
    'pending',
    'investigating',
    'resolved',
    'dismissed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Notification severity enum
DO $$ BEGIN
  CREATE TYPE "notification_severity" AS ENUM(
    'low',
    'medium',
    'high',
    'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Backup status enum
DO $$ BEGIN
  CREATE TYPE "backup_status" AS ENUM(
    'in_progress',
    'completed',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create missing admin tables that reference these enums

CREATE TABLE IF NOT EXISTS "system_health" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "service_name" varchar(100) NOT NULL,
  "status" "system_health_status" NOT NULL,
  "response_time" integer,
  "error_count" integer DEFAULT 0,
  "last_check" timestamp DEFAULT now(),
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "admin_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" varchar(50) NOT NULL,
  "title" varchar(200) NOT NULL,
  "message" text NOT NULL,
  "severity" "notification_severity" DEFAULT 'medium',
  "read" boolean DEFAULT false,
  "actionable" boolean DEFAULT false,
  "action_url" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "data_backups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "backup_type" varchar(50) NOT NULL,
  "file_path" text NOT NULL,
  "file_size_mb" integer,
  "compression_type" varchar(20),
  "status" "backup_status" DEFAULT 'in_progress' NOT NULL,
  "started_at" timestamp DEFAULT now(),
  "completed_at" timestamp,
  "error_message" text,
  "metadata" jsonb
);