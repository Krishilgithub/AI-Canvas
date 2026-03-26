-- AI Canvas Database Schema
-- Run this in Supabase SQL Editor after creating your project

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Stores additional user profile information
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text,
  avatar_url text,
  email text not null,
  bio text
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================
-- AUTO-CREATE PROFILE TRIGGER
-- ============================================
-- Automatically create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- UPDATE TIMESTAMP TRIGGER
-- ============================================
-- Automatically update the updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ============================================
-- LINKEDIN POSTS TABLE (OPTIONAL)
-- ============================================
-- Uncomment if you want to store LinkedIn post data

create table public.linkedin_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  content text not null,
  status text default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed')),
  scheduled_for timestamp with time zone,
  published_at timestamp with time zone,
  post_url text,
  engagement jsonb default '{}'::jsonb
);

alter table public.linkedin_posts enable row level security;

create policy "Users can view their own posts"
  on public.linkedin_posts for select
  using (auth.uid() = user_id);

create policy "Users can create their own posts"
  on public.linkedin_posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own posts"
  on public.linkedin_posts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.linkedin_posts for delete
  using (auth.uid() = user_id);

-- ============================================
-- INTEGRATIONS TABLE (OPTIONAL)
-- ============================================
-- Uncomment if you want to store integration credentials

create table public.integrations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  platform text not null check (platform in ('linkedin', 'twitter', 'facebook', 'instagram')),
  is_connected boolean default false,
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  platform_user_id text,
  platform_username text,
  metadata jsonb default '{}'::jsonb,
  unique(user_id, platform)
);

alter table public.integrations enable row level security;

create policy "Users can view their own integrations"
  on public.integrations for select
  using (auth.uid() = user_id);

create policy "Users can manage their own integrations"
  on public.integrations for all
  using (auth.uid() = user_id);

-- ============================================
-- AUTOMATION WORKFLOWS TABLE (OPTIONAL)
-- ============================================
-- Uncomment if you want to store automation workflows

create table public.workflows (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text,
  is_active boolean default false,
  schedule text,
  config jsonb default '{}'::jsonb,
  last_run_at timestamp with time zone,
  next_run_at timestamp with time zone
);

alter table public.workflows enable row level security;

create policy "Users can view their own workflows"
  on public.workflows for select
  using (auth.uid() = user_id);

create policy "Users can manage their own workflows"
  on public.workflows for all
  using (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get user profile with auth data
create or replace function public.get_profile()
returns json as $$
declare
  profile_data json;
begin
  select json_build_object(
    'id', p.id,
    'email', p.email,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  ) into profile_data
  from public.profiles p
  where p.id = auth.uid();
  
  return profile_data;
end;
$$ language plpgsql security definer;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
create index profiles_email_idx on public.profiles(email);

-- Uncomment if you create the optional tables:
-- create index linkedin_posts_user_id_idx on public.linkedin_posts(user_id);
-- create index linkedin_posts_status_idx on public.linkedin_posts(status);
-- create index integrations_user_id_idx on public.integrations(user_id);
-- create index integrations_platform_idx on public.integrations(platform);
-- create index workflows_is_active_idx on public.workflows(is_active);

-- ============================================
-- USER API KEYS (FEATURE 1)
-- ============================================
create table public.user_api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  provider text not null check (provider in ('openai', 'gemini', 'claude')),
  encrypted_api_key text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, provider)
);

alter table public.user_api_keys enable row level security;

create policy "Users can view their own API keys"
  on public.user_api_keys for select
  using (auth.uid() = user_id);

create policy "Users can manage their own API keys"
  on public.user_api_keys for all
  using (auth.uid() = user_id);

-- ============================================
-- AUTOMATION CONFIGS (FEATURE 2)
-- ============================================
create table public.automation_configs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  platform text not null,
  preferred_time text, -- format HH:MM
  timezone text default 'UTC',
  frequency text check (frequency in ('daily', 'alternate_days', 'weekly')),
  auto_post_enabled boolean default false,
  last_posted_at timestamp with time zone,
  niches text[],
  keywords text[],
  tone_profile text,
  schedule_cron text,
  smart_scheduling boolean default true,
  require_approval boolean default true,
  auto_retweet boolean default false,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, platform)
);

alter table public.automation_configs enable row level security;

create policy "Users can view their own automation configs"
  on public.automation_configs for select
  using (auth.uid() = user_id);

create policy "Users can manage their own automation configs"
  on public.automation_configs for all
  using (auth.uid() = user_id);

