# TheSet - Real-time Setup Guide

## 🚨 Critical Setup Required

TheSet is a **real-time concert setlist voting app** that requires Supabase configuration to function properly. Without proper setup, you'll see an "Setup required" indicator and real-time features won't work.

## Quick Setup (5 minutes)

### 1. Copy Environment File
```bash
cp .env.example .env.local
```

### 2. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project (takes ~2 minutes)

### 3. Get Your Supabase Keys
From your Supabase project dashboard:
1. Go to **Settings** → **API**
2. Copy the **Project URL** and **anon public** key

### 4. Update `.env.local`
Replace the placeholder values:

```bash
# Replace these with your actual Supabase values
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here

# Server-side Supabase config (same values)
SUPABASE_URL=https://your-project-id.supabase.co  
SUPABASE_ANON_KEY=your-actual-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 5. Restart Your Dev Server
```bash
pnpm dev
```

## ✅ Verification

After setup, you should see:
- **Green "Live updates active"** indicator in the header
- **Console logs**: `🟢 Real-time connection established successfully`
- **Real-time features working**: votes update instantly, etc.

## ❌ Troubleshooting

### "Setup required" indicator shows:
- Check console for detailed error messages
- Verify `.env.local` has actual Supabase values (not placeholders)
- Ensure no trailing spaces in environment variables
- Restart the dev server after changes

### Still having issues?
Check the browser console for error messages starting with 🔴. The app will tell you exactly what's wrong.

---

## Why This Matters

TheSet's core features depend on real-time updates:
- **Live voting** - see vote counts change instantly  
- **Real-time setlists** - new songs appear immediately
- **Live show status** - know when shows start/end
- **Follower counts** - instant follow/unfollow feedback

Without Supabase, these features fall back to manual refresh mode, which breaks the user experience.