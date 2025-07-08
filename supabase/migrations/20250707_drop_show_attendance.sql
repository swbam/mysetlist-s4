-- Remove show attendance feature (deprecated)

-- Drop triggers and functions if they exist
DROP TRIGGER IF EXISTS update_show_attendee_count_trigger ON user_show_attendance;
DROP FUNCTION IF EXISTS update_show_attendee_count CASCADE;
DROP FUNCTION IF EXISTS increment_attendee_count CASCADE;
DROP FUNCTION IF EXISTS decrement_attendee_count CASCADE;

-- Drop table
DROP TABLE IF EXISTS user_show_attendance CASCADE;