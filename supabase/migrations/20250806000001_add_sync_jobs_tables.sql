-- Add sync jobs tracking tables for background processing
CREATE TABLE sync_jobs (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL, -- 'artist', 'venue', 'show'
    entity_id TEXT NOT NULL,
    spotify_id TEXT,
    ticketmaster_id TEXT,
    setlistfm_id TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, failed, partial
    priority INTEGER NOT NULL DEFAULT 1, -- 1=high, 2=normal, 3=low
    
    -- Progress tracking
    total_steps INTEGER DEFAULT 0,
    completed_steps INTEGER DEFAULT 0,
    current_step TEXT,
    
    -- Job details
    job_type TEXT NOT NULL, -- 'full_sync', 'shows_only', 'catalog_only', 'update'
    metadata JSONB, -- Additional job-specific data
    error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Feature flags
    auto_retry BOOLEAN DEFAULT TRUE,
    max_retries INTEGER DEFAULT 3,
    retry_count INTEGER DEFAULT 0
);

CREATE TABLE sync_progress (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
    
    -- Progress details
    step TEXT NOT NULL, -- 'fetching_artist', 'importing_shows', 'syncing_songs'
    status TEXT NOT NULL, -- 'pending', 'in_progress', 'completed', 'failed'
    progress INTEGER DEFAULT 0, -- 0-100
    message TEXT,
    
    -- Data counts
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    successful_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX sync_jobs_status_priority_idx ON sync_jobs(status, priority, created_at);
CREATE INDEX sync_jobs_entity_idx ON sync_jobs(entity_type, entity_id);
CREATE INDEX sync_progress_job_id_idx ON sync_progress(job_id, created_at);

-- RLS policies (if using RLS)
-- ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sync_progress ENABLE ROW LEVEL SECURITY;