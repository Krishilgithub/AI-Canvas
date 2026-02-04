-- Add user settings columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS billing_cycle_end TIMESTAMPTZ;

-- Add index on api_key for faster lookups during auth validation
CREATE INDEX IF NOT EXISTS idx_profiles_api_key ON profiles(api_key);
