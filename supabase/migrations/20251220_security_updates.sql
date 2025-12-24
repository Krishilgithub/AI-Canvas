-- Security Updates and Performance Optimizations

-- 1. Enable RLS on detected_trends
ALTER TABLE public.detected_trends ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view trends
CREATE POLICY "Authenticated users can view trends" 
ON public.detected_trends FOR SELECT 
TO authenticated 
USING (true);

-- 2. Performance Indexes

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Linked Accounts
CREATE INDEX IF NOT EXISTS idx_linked_accounts_user_id ON public.linked_accounts(user_id);

-- Automation Configs
CREATE INDEX IF NOT EXISTS idx_automation_configs_user_id ON public.automation_configs(user_id);

-- Generated Posts
CREATE INDEX IF NOT EXISTS idx_generated_posts_user_id ON public.generated_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_posts_status ON public.generated_posts(status);
CREATE INDEX IF NOT EXISTS idx_generated_posts_trend_id ON public.generated_posts(trend_id);

-- Automation Logs
CREATE INDEX IF NOT EXISTS idx_automation_logs_user_id ON public.automation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON public.automation_logs(created_at);

-- Detected Trends
CREATE INDEX IF NOT EXISTS idx_detected_trends_velocity ON public.detected_trends(velocity_score DESC);
CREATE INDEX IF NOT EXISTS idx_detected_trends_created_at ON public.detected_trends(created_at DESC);
