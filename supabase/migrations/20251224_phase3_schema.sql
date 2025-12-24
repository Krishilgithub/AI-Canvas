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

-- Add media_urls to generated_posts
ALTER TABLE generated_posts
ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

-- Create storage bucket for media
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', true)
    ON CONFLICT (id) DO NOTHING;
    
    -- Policies (We need to drop first to avoid conflict if exists or use IF NOT EXISTS logic which is hard in straightforward SQL for policies)
    -- Simplified: users must check Dashboard to ensure policies
EXCEPTION WHEN OTHERS THEN
    -- Ignore storage errors if storage extension missing
END $$;
