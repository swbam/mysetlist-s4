-- Create import_logs table for detailed import tracking
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id VARCHAR(255) NOT NULL,
  artist_name VARCHAR(255),
  ticketmaster_id VARCHAR(255),
  spotify_id VARCHAR(255),
  job_id VARCHAR(255), -- Links to sync_jobs if applicable
  
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_import_logs_artist_id ON import_logs(artist_id);
CREATE INDEX idx_import_logs_job_id ON import_logs(job_id);
CREATE INDEX idx_import_logs_created_at ON import_logs(created_at DESC);
CREATE INDEX idx_import_logs_level ON import_logs(level);
CREATE INDEX idx_import_logs_artist_name ON import_logs(artist_name);

-- Add column to import_status for tracking detailed metrics
ALTER TABLE import_status ADD COLUMN IF NOT EXISTS job_id VARCHAR(255);
ALTER TABLE import_status ADD COLUMN IF NOT EXISTS total_songs INTEGER DEFAULT 0;
ALTER TABLE import_status ADD COLUMN IF NOT EXISTS total_shows INTEGER DEFAULT 0;
ALTER TABLE import_status ADD COLUMN IF NOT EXISTS total_venues INTEGER DEFAULT 0;
ALTER TABLE import_status ADD COLUMN IF NOT EXISTS artist_name VARCHAR(255);
ALTER TABLE import_status ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE import_status ADD COLUMN IF NOT EXISTS phase_timings JSONB;

-- Create view for latest import status per artist
CREATE OR REPLACE VIEW latest_import_status AS
SELECT DISTINCT ON (artist_id)
  artist_id,
  artist_name,
  stage,
  percentage,
  message,
  error,
  total_songs,
  total_shows,
  total_venues,
  started_at,
  completed_at,
  created_at,
  updated_at
FROM import_status
ORDER BY artist_id, created_at DESC;