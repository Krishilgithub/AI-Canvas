# 🚀 Quick Start - Supabase Setup

## 📋 Prerequisites Checklist
- [ ] Supabase account created
- [ ] New project created in Supabase
- [ ] Project fully provisioned (takes ~2 minutes)

## ⚡ 3-Step Setup

### 1️⃣ Get Your Credentials
Go to: **Supabase Dashboard → Settings → API**

Copy these two values:
```
Project URL: https://xxxxx.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2️⃣ Update .env.local
Open `.env.local` and paste your credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3️⃣ Setup Database (Optional but Recommended)
1. Go to: **Supabase Dashboard → SQL Editor**
2. Click "New Query"
3. Copy the contents of `supabase-schema.sql`
4. Paste and click "Run"

## 🧪 Test It!

```bash
# Restart dev server
npm run dev

# Open browser
http://localhost:3000/signup

# Create account and test!
```

## 🎯 What Works Now?
✅ Sign up with email/password  
✅ Login  
✅ Sign out  
✅ Protected dashboard routes  
✅ Auto-redirect when logged in  
✅ User session persistence  

## 🔧 Optional: Enable Google OAuth

1. **Supabase Dashboard → Authentication → Providers**
2. Click **Google** and toggle **Enabled**
3. Follow the setup wizard to:
   - Create Google Cloud Project
   - Get Client ID & Secret
   - Add redirect URI: `https://xxxxx.supabase.co/auth/v1/callback`
4. Save

## 📞 Need Help?

See `SUPABASE_SETUP.md` for detailed instructions and troubleshooting!

---

**🎉 That's it! You're ready to go!**
