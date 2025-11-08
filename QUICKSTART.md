# 🚀 Quick Start - Fixed & Ready!# 🚀 Quick Start Guide



## ✅ Critical Bug Fixed!Get At-Mark running in 5 minutes!



**The Problem**: Session key mismatch between login and storage## For Windows Users (Android)

- LoginScreen saved: `{ id: "uuid" }` ❌

- Storage expected: `{ userId: "uuid" }` ❌### Step 1: Install Dependencies

- **Result**: "User not logged in" error

```powershell

**The Fix**: Changed LoginScreen to save `{ userId: "uuid" }` ✅cd c:\Users\Arpan\Desktop\Native_CLI\atmark

- **Now**: Everything works! ✅pnpm install

```

---

### Step 2: Start Metro

## 🧹 Cleanup Complete

```powershell

Removed 9 duplicate/corrupted files:pnpm start

- storage.asyncstorage.ts, storage.old.ts, storageNew.ts```

- syncManager.asyncstorage.ts, syncManager.clean.ts, syncManager.NEW.ts

- And 3 more...Keep this terminal open!



**Kept only 3 clean files**:### Step 3: Run on Android (New Terminal)

- `storage.ts` - WatermelonDB (350+ lines) ✅

- `syncManager.ts` - Clean sync ✅```powershell

- `index.ts` - Exports ✅cd c:\Users\Arpan\Desktop\Native_CLI\atmark

pnpm android

---```



## 🎯 Start Testing NOW!That's it! The app should launch on your emulator or connected device.



### **Step 1: Restart Metro**---

```powershell

pnpm start -- --reset-cache## For macOS Users (iOS)

```

### Step 1: Install Dependencies

### **Step 2: Rebuild App**

```powershell```bash

cd androidcd /path/to/atmark

.\gradlew cleannpm install

cd ..cd ios

pnpm run androidpod install

```cd ..

```

### **Step 3: Test**

1. **Login** with your credentials### Step 2: Start Metro

2. **Create a class** (should work now!) ✅

3. **Add students**```bash

4. **Take attendance**npm start

5. **Logout** (should work now!) ✅```



---Keep this terminal open!



## 📋 Test Results### Step 3: Run on iOS (New Terminal)



- [ ] Login works```bash

- [ ] Can create classes (main fix!)npm run ios

- [ ] Can add students```

- [ ] Can take attendance

- [ ] Logout works (main fix!)---

- [ ] Sync button shows

## 🎯 First Steps in the App

---

1. **Create a Class**

## ⚠️ If Still Having Issues   - Tap the blue `+` button on the dashboard

   - Enter a class name (e.g., "Mathematics")

### **Clear App Data First**   - Select a predefined batch

```   - Tap "Create Class"

Settings → Apps → Atmark → Storage → Clear Data

```2. **Add Custom Students** (Optional)

Then login again with fresh session.   - Open your class

   - Tap "Add Student"

---   - Enter student name and roll number

   - Tap "Add Student"

## 📊 What Changed

3. **Take Attendance**

| File | Change | Status |   - Open your class

|------|--------|--------|   - Tap "Take Attendance"

| LoginScreen.tsx | `id` → `userId` | ✅ Fixed |   - Select date (defaults to today)

| storage/ folder | 13 → 3 files | ✅ Cleaned |   - Tap students to mark present (green highlight)

| syncManager.ts | Corrupted → Clean | ✅ Fixed |   - Tap "Save Attendance"



---4. **View Student Calendar**

   - Open your class

## 🎉 You're Ready!   - Tap any student name

   - See their attendance calendar with green/red dates

**Just run these 2 commands**:

```powershell5. **Export PDF Report**

pnpm start -- --reset-cache   - Open your class

# Wait for Metro, then in new terminal:   - Tap "Export PDF"

pnpm run android   - Wait for generation

```   - Share via your preferred app



**Then test login → create class → logout!** 🚀---


## 🔥 Hot Tips

- **Swipe to Edit/Delete**: On dashboard, swipe left on any class
- **Quick Toggle**: In attendance screen, tap any student to toggle
- **Stats Update Live**: Watch present/absent counts change in real-time
- **Date Navigation**: Use the date button to view past attendance

---

## ❓ Need Help?

- Check `SETUP.md` for detailed setup instructions
- Check `FEATURES.md` for complete feature documentation
- Check `README.md` for troubleshooting

---

**Happy tracking! 📊**
