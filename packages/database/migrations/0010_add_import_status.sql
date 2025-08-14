-- Create enum for import stages
CREATE TYPE "import_stage" AS ENUM ('initializing', 'syncing-identifiers', 'importing-songs', 'importing-shows', 'creating-setlists', 'completed', 'failed');

-- Create import status table
CREATE TABLE IF NOT EXISTS "import_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" varchar(255) NOT NULL,
	"stage" "import_stage" NOT NULL,
	"percentage" integer DEFAULT 0,
	"message" text,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
