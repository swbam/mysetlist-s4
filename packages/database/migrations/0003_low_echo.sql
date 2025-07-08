DROP TABLE "user_daily_votes";--> statement-breakpoint
DROP TABLE "user_vote_limits";--> statement-breakpoint
DROP TABLE "vote_analytics";--> statement-breakpoint
DROP TABLE "api_health_alerts";--> statement-breakpoint
DROP TABLE "api_health_metrics";--> statement-breakpoint
DROP TABLE "api_request_metrics";--> statement-breakpoint
DROP TABLE "artist_relationships";--> statement-breakpoint
DROP TABLE "artist_top_tracks";--> statement-breakpoint
DROP TABLE "circuit_breaker_states";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "display_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "bio";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar_url";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "spotify_connected";