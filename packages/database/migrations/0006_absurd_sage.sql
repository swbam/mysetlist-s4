ALTER TABLE "venues" ADD COLUMN "ticketmaster_id" text;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_ticketmaster_id_unique" UNIQUE("ticketmaster_id");