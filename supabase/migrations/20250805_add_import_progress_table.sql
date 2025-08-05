-- Table to broadcast song-import progress via Supabase realtime

CREATE TABLE IF NOT EXISTS public.import_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  current integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress', -- in_progress, completed, error
  message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable row level security so clients can read their own progress (or all)
ALTER TABLE public.import_progress ENABLE ROW LEVEL SECURITY;

-- Allow anon read only
CREATE POLICY "read_import_progress" ON public.import_progress
  FOR SELECT USING (true);

-- Realtime publication
ALTER TABLE public.import_progress REPLICA IDENTITY FULL;

GRANT SELECT, INSERT, UPDATE ON public.import_progress TO service_role;

