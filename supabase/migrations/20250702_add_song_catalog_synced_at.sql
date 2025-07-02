-- Adds song_catalog_synced_at column to artists
aLTER TABLE artists ADD COLUMN IF NOT EXISTS song_catalog_synced_at TIMESTAMPTZ; 