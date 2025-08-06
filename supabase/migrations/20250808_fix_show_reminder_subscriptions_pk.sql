-- Fix duplicate primary key on show_reminder_subscriptions
BEGIN;

-- Drop composite primary key if it exists
ALTER TABLE IF EXISTS public.show_reminder_subscriptions
  DROP CONSTRAINT IF EXISTS show_reminder_subscriptions_user_id_show_id_pk;

-- Replace with UNIQUE constraint
ALTER TABLE IF EXISTS public.show_reminder_subscriptions
  ADD CONSTRAINT show_reminder_subscriptions_user_id_show_id_uniq
  UNIQUE (user_id, show_id);

COMMIT;

