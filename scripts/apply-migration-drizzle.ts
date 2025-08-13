import * as fs from "node:fs";
import * as path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../packages/database/src";

async function applyMigration() {
  try {
    console.log("Applying migration: user_follows_artists table...");

    // Create the table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_follows_artists (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        PRIMARY KEY (user_id, artist_id)
      )
    `);

    console.log("✅ Table created");

    // Add indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_follows_artists_user_id ON user_follows_artists(user_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_follows_artists_artist_id ON user_follows_artists(artist_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_follows_artists_created_at ON user_follows_artists(created_at DESC)
    `);

    console.log("✅ Indexes created");

    // Enable RLS
    await db.execute(sql`
      ALTER TABLE user_follows_artists ENABLE ROW LEVEL SECURITY
    `);

    // Create policies (will fail if they already exist, which is OK)
    try {
      await db.execute(sql`
        CREATE POLICY "Anyone can view follows" ON user_follows_artists
          FOR SELECT USING (true)
      `);

      await db.execute(sql`
        CREATE POLICY "Users can manage their own follows" ON user_follows_artists
          FOR ALL USING (auth.uid() = user_id)
      `);

      console.log("✅ RLS policies created");
    } catch (policyError: any) {
      if (policyError.message?.includes("already exists")) {
        console.log("ℹ️  RLS policies already exist");
      } else {
        throw policyError;
      }
    }

    console.log("✅ Migration applied successfully!");
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log("ℹ️  Table or objects already exist - this is OK");
    } else {
      console.error("Error applying migration:", error.message);
      throw error;
    }
  }
}

applyMigration().catch(console.error);
