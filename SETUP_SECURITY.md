# 🚀 Quick Setup - Security & Architecture

## ⚡ 5-Minute Setup

### **Step 1: Create `.env` file**

```bash
# Copy the example
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

### **Step 2: Clear cache and rebuild**

```bash
# Clear Metro cache
pnpm start --reset-cache

# In a new terminal, rebuild the app
pnpm android
```

### **Step 3: Test**

1. **Login** - Should show "Loading your classes..." message
2. **Dashboard** - Should show loading spinner
3. **Create a class** - Works offline
4. **Press Sync button** - Uploads to Supabase

---

## 🔒 What Changed?

### **Security Improvements:**

✅ **Credentials no longer in source code**
- Moved to `.env` file
- `.env` is gitignored (safe to share code)
- Environment-specific configs (dev/prod)

✅ **User data isolation already implemented**
- Each user sees only their own data
- Row Level Security (RLS) on Supabase
- `user_id` filtering on all queries

### **Architecture Improvements:**

✅ **Login fetches data from cloud**
- On successful login, app fetches user's classes
- Shows clear loading messages
- Syncs cloud → local WatermelonDB

✅ **Offline-first, manual sync**
- App works completely offline
- Data saved locally (WatermelonDB)
- Sync ONLY when user presses sync button
- Removed automatic background sync

✅ **Loading indicators**
- Login screen: "Logging in...", "Loading your classes..."
- Dashboard: "Loading your classes..." with spinner
- Clear user feedback

---

## 📱 How It Works Now

```
LOGIN:
1. User enters credentials
2. Authenticate with Supabase
3. Show "Loading your classes..." ← NEW
4. Fetch classes from cloud ← NEW
5. Store locally in WatermelonDB
6. Navigate to dashboard

OFFLINE USAGE:
- Create classes ✅ (local)
- Add students ✅ (local)
- Mark attendance ✅ (local)
- View history ✅ (local)

MANUAL SYNC:
1. User presses sync button ← User controlled
2. Upload to Supabase (if online)
3. Show success toast
```

---

## ⚠️ Important Notes

### **For Sharing Code:**

✅ **Safe to share:**
- All source code files
- `.env.example` (template)
- `.gitignore` (already updated)

❌ **Never share:**
- `.env` file (contains secrets)
- Supabase credentials directly

### **For Team Members:**

Each developer needs to:
1. Clone the repo
2. Create their own `.env` file
3. Add Supabase credentials
4. Build and run

---

## 🧪 Testing

```bash
# Test 1: Check credentials are loaded
# Should see: "[Supabase] Client initialized successfully"
# Should NOT see: "[Supabase] Missing environment variables!"

# Test 2: Login flow
# 1. Login with valid credentials
# 2. Should see: "Logging in..." then "Loading your classes..."
# 3. Dashboard should show loading spinner
# 4. Classes should appear (or empty state if none)

# Test 3: Offline mode
# 1. Turn off internet
# 2. Create a class - should work
# 3. Sync button should be disabled (offline icon)

# Test 4: Manual sync
# 1. Turn on internet
# 2. Press sync button
# 3. Should see: "Sync completed successfully!"
# 4. Check Supabase dashboard - data should be there
```

---

## 🔧 Troubleshooting

### **"Missing environment variables" error**

**Solution:**
```bash
# 1. Check .env file exists
ls -la .env

# 2. Check .env content
cat .env

# 3. Rebuild app
pnpm start --reset-cache
pnpm android
```

### **"Supabase client not initialized"**

**Solution:**
- Check `.env` has correct SUPABASE_URL and SUPABASE_ANON_KEY
- Restart Metro bundler: `pnpm start --reset-cache`

### **Data not syncing**

**Solution:**
1. Check network connection (sync button should be enabled)
2. Check Supabase dashboard → Table Editor
3. Check RLS policies are enabled
4. Look for `[Sync]` logs in terminal

---

## 📋 Checklist

Before sharing your code:

- [ ] `.env` file is in `.gitignore`
- [ ] No hardcoded credentials in source code
- [ ] `.env.example` exists with template
- [ ] README has setup instructions
- [ ] Tested login → fetch → sync flow
- [ ] Tested offline mode
- [ ] Tested manual sync

---

## 🎯 Summary

**What's Protected:**
- ✅ Supabase credentials (moved to .env)
- ✅ User data (RLS policies)
- ✅ No automatic background sync

**What's Improved:**
- ✅ Login fetches cloud data
- ✅ Clear loading indicators
- ✅ Offline-first architecture
- ✅ Manual sync control

**Ready to deploy!** 🚀
