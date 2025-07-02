-- Adds ticketmaster_id column to artists
aLTER TABLE artists ADD COLUMN IF NOT EXISTS ticketmaster_id TEXT UNIQUE; 