import { NextResponse } from "next/server";
import { db } from "@repo/database";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // Create import_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS import_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        artistId VARCHAR(255) NOT NULL,
        artist_name VARCHAR(255),
        tm_attraction_id VARCHAR(255),
        spotify_id VARCHAR(255),
        job_id VARCHAR(255),
        
        -- Log details
        level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'error', 'success', 'debug')),
        stage VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        details JSONB,
        
        -- Metrics
        items_processed INTEGER DEFAULT 0,
        items_total INTEGER,
        duration_ms INTEGER,
        
        -- Error tracking
        error_code VARCHAR(50),
        error_stack TEXT,
        
        -- Timestamps
        _creationTime TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_import_logs_artistId ON import_logs(artistId)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_import_logs_job_id ON import_logs(job_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_import_logs__creationTime ON import_logs(_creationTime DESC)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_import_logs_level ON import_logs(level)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_import_logs_artist_name ON import_logs(artist_name)`);

    // Update import_status table
    await db.execute(sql`ALTER TABLE import_status ADD COLUMN IF NOT EXISTS job_id VARCHAR(255)`);
    await db.execute(sql`ALTER TABLE import_status ADD COLUMN IF NOT EXISTS total_songs INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE import_status ADD COLUMN IF NOT EXISTS totalShows INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE import_status ADD COLUMN IF NOT EXISTS total_venues INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE import_status ADD COLUMN IF NOT EXISTS artist_name VARCHAR(255)`);
    await db.execute(sql`ALTER TABLE import_status ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE`);
    await db.execute(sql`ALTER TABLE import_status ADD COLUMN IF NOT EXISTS phase_timings JSONB`);

    return NextResponse.json({ 
      success: true, 
      message: "Import logs tables created successfully" 
    });
  } catch (error: any) {
    console.error("Failed to setup import logs:", error);
    return NextResponse.json(
      { error: "Failed to setup import logs", details: error.message },
      { status: 500 }
    );
  }
}