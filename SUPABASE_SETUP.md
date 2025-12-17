# Supabase Setup Guide for AI Canvas

## ✅ What's Been Set Up (Code-Side)

All the code integration is complete! Here's what I've implemented:

### Installed Packages
- `@supabase/supabase-js` - Supabase JavaScript client
- `@supabase/ssr` - Server-side rendering support for Next.js

### Created Files Structure
```
src/
├── lib/
│   └── supabase/
│       ├── client.ts          # Browser client for client components
│       ├── server.ts           # Server client for server components
│       ├── middleware.ts       # Authentication middleware
│       ├── actions.ts          # Server actions (login, signup, signout)
│       └── types.ts            # TypeScript database types
├── middleware.ts               # Next.js middleware for route protection
└── app/
    ├── (auth)/
    │   ├── login/page.tsx     # Updated with Supabase auth
    │   └── signup/page.tsx    # Updated with Supabase auth
    └── auth/
        └── callback/route.ts   # OAuth callback handler
```

### Features Implemented
✅ Email/password authentication
✅ Google OAuth integration (ready to use)
✅ Protected routes (dashboard, automation, integrations, linkedin, settings)
✅ Auto-redirect logged-in users from auth pages
✅ Sign out functionality
✅ Error handling and loading states
✅ User session management

---

## 🚀 Your Turn: Supabase Project Setup

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign in"** if you have an account
3. Click **"New Project"**
4. Fill in the details:
   - **Organization**: Select or create one
   - **Name**: `ai-canvas` (or your preferred name)
   - **Database Password**: Create a strong password and **SAVE IT SECURELY**
   - **Region**: Choose the closest to your users (e.g., US East, EU West, etc.)
5. Click **"Create new project"**
6. Wait ~2 minutes for the project to be provisioned

### Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** (gear icon) → **API**
2. You'll see:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: A long string starting with `eyJ...`
3. Copy both of these values

### Step 3: Update Environment Variables

Open the `.env.local` file in your project root and replace the placeholder values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: After updating `.env.local`, you'll need to restart your dev server!

### Step 4: Set Up Authentication in Supabase Dashboard

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. **Email provider** should already be enabled
3. For Google OAuth (optional but recommended):
   - Click on **Google** provider
   - Toggle it to **Enabled**
   - You'll need to:
     - Create a Google Cloud Project
     - Enable Google+ API
     - Create OAuth 2.0 credentials
     - Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
   - Enter your Client ID and Client Secret
   - Save

### Step 5: Configure Site URL and Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Set your **Site URL** to:
   - Development: `http://localhost:3000`
   - Production: Your actual domain
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - Add your production URL when deployed

### Step 6: Create Database Tables (Optional)

If you want to store additional user profile data, create a `profiles` table:

1. Go to **SQL Editor** in Supabase
2. Click **"New Query"**
3. Paste this SQL:

```sql
-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text,
  avatar_url text,
  email text not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Create policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Create a trigger to create profile on signup
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
```

4. Click **"Run"**

---

## 🧪 Testing Your Setup

### Test Email/Password Authentication

1. Restart your dev server:
   ```bash
   npm run dev
   ```

2. Go to `http://localhost:3000/signup`
3. Create a test account with:
   - First Name and Last Name
   - Email address
   - Password (min 6 characters)
4. Click "Create account"
5. Check your email for a confirmation link (if email confirmation is enabled in Supabase)
6. You should be redirected to `/dashboard`

### Test Sign In

1. Go to `http://localhost:3000/login`
2. Enter your credentials
3. Click "Sign in"
4. You should be redirected to `/dashboard`

### Test Sign Out

1. While logged in, click the **"Sign Out"** button in the sidebar
2. You should be redirected to `/login`

### Test Protected Routes

1. While logged out, try to access `http://localhost:3000/dashboard`
2. You should be automatically redirected to `/login`
3. After logging in, you should be redirected back to `/dashboard`

---

## 🎯 Next Steps

### Email Confirmation (Optional)
By default, Supabase may require email confirmation. To disable it during development:
1. Go to **Authentication** → **Settings**
2. Uncheck **"Enable email confirmations"**

### Customize Email Templates
1. Go to **Authentication** → **Email Templates**
2. Customize the look and content of:
   - Confirmation emails
   - Password reset emails
   - Magic link emails

### Add More OAuth Providers
You can also enable:
- GitHub
- GitLab
- Bitbucket
- Azure
- And more!

---

## 📚 Key Files to Know

- **`.env.local`**: Your environment variables (never commit this!)
- **`src/lib/supabase/actions.ts`**: Auth functions (login, signup, signout)
- **`src/lib/supabase/client.ts`**: For client-side auth operations
- **`src/lib/supabase/server.ts`**: For server-side auth operations
- **`src/middleware.ts`**: Route protection logic

---

## 🐛 Troubleshooting

### "Invalid API Key"
- Make sure you copied the correct anon/public key
- Restart your dev server after updating `.env.local`

### "Email not confirmed"
- Check your email for confirmation link
- Or disable email confirmation in Supabase settings

### Redirect not working
- Verify redirect URLs in Supabase dashboard match your app URLs
- Check that middleware is running (should see requests in terminal)

### OAuth not working
- Ensure you've set up the provider correctly in Google Cloud/GitHub
- Verify redirect URIs match exactly

---

## 🎉 You're All Set!

Your AI Canvas project now has:
- ✅ Full authentication system
- ✅ Protected routes
- ✅ OAuth ready (Google)
- ✅ User session management
- ✅ Sign in/Sign up/Sign out flows

Need help? Check the [Supabase Documentation](https://supabase.com/docs/guides/auth) for more details!
