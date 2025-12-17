-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS
-- Handled by Supabase Auth (auth.users), but we create a public profile table.
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. LINKED ACCOUNTS
-- Stores OAuth tokens and connection state.
CREATE TYPE connection_platform AS ENUM ('linkedin', 'twitter', 'slack');
CREATE TYPE connection_status AS ENUM ('connected', 'disconnected', 'expired');

CREATE TABLE public.linked_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    platform connection_platform NOT NULL,
    platform_user_id TEXT, -- The external ID (e.g., LinkedIn Urn)
    platform_username TEXT,
    access_token TEXT NOT NULL, -- Encrypt in app level before storing if possible, or use Supabase Vault
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    status connection_status DEFAULT 'connected',
    metadata JSONB DEFAULT '{}', -- Store extra profile info
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- 3. AUTOMATION CONFIGURATIONS
-- Stores the rules for the AI Agent.
CREATE TABLE public.automation_configs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    platform connection_platform NOT NULL,
    niches TEXT[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    tone_profile JSONB DEFAULT '{"professionalism": 75, "voice": "thought_leader"}',
    schedule_cron TEXT DEFAULT '0 9 * * 1-5', -- 9 AM Mon-Fri
    require_approval BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- 4. DETECTED TRENDS
-- Trends ingested from n8n or other sources.
CREATE TABLE public.detected_trends (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    topic TEXT NOT NULL,
    category TEXT,
    source TEXT DEFAULT 'n8n_scraper',
    velocity_score INTEGER CHECK (velocity_score >= 0 AND velocity_score <= 100),
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. GENERATED POSTS (Drafts & History)
CREATE TYPE post_status AS ENUM ('draft', 'needs_approval', 'approved', 'scheduled', 'published', 'rejected', 'failed');

CREATE TABLE public.generated_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    linked_account_id UUID REFERENCES public.linked_accounts(id) ON DELETE SET NULL,
    trend_id UUID REFERENCES public.detected_trends(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    media_urls TEXT[] DEFAULT '{}',
    status post_status DEFAULT 'draft',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    platform_post_id TEXT,
    ai_metadata JSONB DEFAULT '{}', -- Prompt used, model version, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. AUTOMATION LOGS (Audit Trail)
CREATE TYPE log_level AS ENUM ('info', 'warning', 'error', 'success');

CREATE TABLE public.automation_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL, -- e.g., "generated_draft", "published_post"
    level log_level DEFAULT 'info',
    message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES (Simple Starter)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own accounts" ON public.linked_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own accounts" ON public.linked_accounts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own configs" ON public.automation_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own configs" ON public.automation_configs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own posts" ON public.generated_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own posts" ON public.generated_posts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own logs" ON public.automation_logs FOR SELECT USING (auth.uid() = user_id);
