ALTER TABLE "setlist_songs" DROP COLUMN IF EXISTS "downvotes";--> statement-breakpoint
ALTER TABLE "setlist_songs" DROP COLUMN IF EXISTS "net_votes";--> statement-breakpoint
ALTER TABLE "votes" DROP COLUMN IF EXISTS "vote_type";