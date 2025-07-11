-- Create user security settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_security_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id)
);

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_security_settings_user_id ON user_security_settings(user_id);

-- Enable Row Level Security
ALTER TABLE user_security_settings ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to view and update their own security settings
CREATE POLICY "Users can view their own security settings" ON user_security_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own security settings" ON user_security_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own security settings" ON user_security_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_user_security_settings_updated_at BEFORE UPDATE
  ON user_security_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();