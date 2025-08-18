ALTER TABLE "api_keys" ALTER COLUMN "id" SET DATA TYPE uuid USING id::uuid;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "user_id" SET DATA TYPE uuid USING user_id::uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
