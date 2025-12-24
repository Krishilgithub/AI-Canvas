-- Add notification_preferences to profiles if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"weekly_digest": true, "post_approval": true, "trend_alert": false, "security_alert": true}';

-- Create analytics table
CREATE TABLE IF NOT EXISTS analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES linked_accounts(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    platform TEXT NOT NULL,
    impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, account_id, date, platform)
);

-- RLS
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics" 
ON analytics_daily FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" 
ON analytics_daily FOR ALL
USING (auth.uid() = user_id);

-- Add index
CREATE INDEX idx_analytics_user_date ON analytics_daily(user_id, date);
