# 📋 Pre-Launch Checklist

Use this checklist to verify everything is working before deploying.

## ✅ Installation Verification

- [ ] Node.js installed (v20+)
- [ ] pnpm/npm installed
- [ ] All dependencies installed (`pnpm install` completed)
- [ ] No installation errors in terminal

### Android
- [ ] Android Studio installed
- [ ] Android SDK Platform 34 installed
- [ ] ANDROID_HOME environment variable set
- [ ] Emulator created or device connected
- [ ] `adb devices` shows connected device

### iOS (macOS only)
- [ ] Xcode installed
- [ ] Command Line Tools installed
- [ ] CocoaPods installed
- [ ] `pod install` completed successfully
- [ ] iOS Simulator available

---

## ✅ Build Verification

### Metro Bundler
- [ ] `pnpm start` runs without errors
- [ ] Metro bundler shows "Welcome to Metro!"
- [ ] No red errors in Metro terminal

### Android Build
- [ ] `pnpm android` completes successfully
- [ ] App installs on device/emulator
- [ ] App launches without crashes
- [ ] No red screen errors

### iOS Build (macOS)
- [ ] `npm run ios` completes successfully
- [ ] App installs on simulator
- [ ] App launches without crashes
- [ ] No red screen errors

---

## ✅ Feature Testing

### Dashboard
- [ ] Dashboard shows "At-Mark" title
- [ ] Info button (top-right) is visible
- [ ] Empty state shows when no classes
- [ ] FAB (+) button visible at bottom-right

### Create Class
- [ ] Tap FAB opens "Add Class" screen
- [ ] Can enter class name
- [ ] 6 batch templates visible
- [ ] Selecting batch shows preview
- [ ] "Create Class" button works
- [ ] Returns to dashboard with new class

### Class List
- [ ] New class appears on dashboard
- [ ] Tap class opens "Class" screen
- [ ] Swipe left shows Edit/Delete buttons
- [ ] Edit button opens inline edit
- [ ] Delete shows confirmation dialog

### Student Management
- [ ] Class screen shows student count
- [ ] Students listed alphabetically
- [ ] "Add Student" button works
- [ ] Can add new student with name + roll
- [ ] Duplicate roll number rejected
- [ ] Edit icon edits student name
- [ ] Delete icon removes student (with confirmation)

### Attendance
- [ ] "Take Attendance" button works
- [ ] Date picker opens on date button tap
- [ ] All students listed
- [ ] Tap student toggles green highlight
- [ ] Stats update (Total/Present/Absent)
- [ ] "Save Attendance" saves data
- [ ] "Delete" removes record (with confirmation)

### Attendance History
- [ ] "View History" button works
- [ ] Date picker functional
- [ ] Shows present students for selected date
- [ ] Empty state for dates without records
- [ ] Statistics correct (X/Y Present)

### Student Calendar
- [ ] Tap student name opens calendar
- [ ] Calendar shows current month
- [ ] Dates marked green (present) or red (absent)
- [ ] Legend shows color meanings
- [ ] Statistics accurate
- [ ] Percentage calculated correctly

### PDF Export
- [ ] "Export PDF" button works
- [ ] Loading indicator appears
- [ ] PDF generates successfully
- [ ] Share sheet opens
- [ ] Can share via email/messaging
- [ ] PDF contains all data
- [ ] PDF formatted correctly

### Contact Screen
- [ ] Info button opens contact screen
- [ ] Gradient hero displays
- [ ] Skill pills visible
- [ ] Email action opens email app
- [ ] Website action opens browser
- [ ] Phone action opens dialer
- [ ] WhatsApp action opens WhatsApp
- [ ] All haptic feedback works

---

## ✅ Data Persistence

- [ ] Create class, close app, reopen - class still there
- [ ] Add student, close app, reopen - student still there
- [ ] Take attendance, close app, reopen - attendance saved
- [ ] Rename class keeps all students and attendance
- [ ] Delete class removes all related data

---

## ✅ UI/UX Testing

### Visual
- [ ] Colors match theme
- [ ] Icons display correctly
- [ ] Text readable
- [ ] Buttons have proper spacing
- [ ] Cards have shadows
- [ ] Gradients render smoothly

### Interactions
- [ ] Buttons respond to tap
- [ ] Haptic feedback on interactions
- [ ] Swipe gestures smooth
- [ ] Scrolling smooth
- [ ] Transitions smooth
- [ ] Loading states show during operations

### Edge Cases
- [ ] Long class names don't overflow
- [ ] Long student names don't overflow
- [ ] Large student lists scroll properly
- [ ] Empty states show appropriately
- [ ] Error messages are user-friendly

---

## ✅ Performance

- [ ] App launches quickly (< 3 seconds)
- [ ] Screen transitions smooth
- [ ] Lists scroll smoothly (60fps)
- [ ] No lag when marking attendance
- [ ] PDF export completes in reasonable time
- [ ] No memory leaks (test with 50+ students)

---

## ✅ Error Handling

- [ ] Empty class name rejected
- [ ] Duplicate class name rejected
- [ ] Empty student fields rejected
- [ ] Duplicate roll number rejected
- [ ] Network errors handled (if future features)
- [ ] Storage errors caught gracefully

---

## ✅ Android Specific

- [ ] Back button works correctly
- [ ] App doesn't crash on rotate
- [ ] Permissions requested properly (if needed)
- [ ] Vector icons display
- [ ] Native date picker works
- [ ] Share sheet works
- [ ] PDF saved to device

---

## ✅ iOS Specific (macOS)

- [ ] Gestures work (swipe back)
- [ ] Safe area respected (notch/island)
- [ ] Native date picker works
- [ ] Share sheet works
- [ ] PDF saved to device
- [ ] Haptic feedback works

---

## ✅ Code Quality

- [ ] No TypeScript errors
- [ ] No ESLint warnings (major)
- [ ] Console.log statements removed (production)
- [ ] No unused imports
- [ ] Proper error handling
- [ ] Comments where needed

---

## ✅ Documentation

- [ ] README.md updated
- [ ] SETUP.md complete
- [ ] FEATURES.md accurate
- [ ] QUICKSTART.md tested
- [ ] Code comments clear
- [ ] TypeScript types documented

---

## ✅ Production Readiness

### Security
- [ ] No hardcoded secrets
- [ ] Environment variables configured (if needed)
- [ ] MMKV encryption key setup (optional)
- [ ] Input validation in place

### Performance
- [ ] Release build tested
- [ ] App size acceptable (< 50MB)
- [ ] Cold start time acceptable
- [ ] Memory usage reasonable
- [ ] Battery usage acceptable

### Analytics (Optional)
- [ ] Analytics events planned
- [ ] Error tracking setup
- [ ] User metrics defined

---

## 🚀 Deployment Checklist

### Android
- [ ] Release keystore generated
- [ ] Signing config updated
- [ ] Version code incremented
- [ ] ProGuard rules verified
- [ ] Release APK tested
- [ ] AAB generated for Play Store

### iOS (macOS)
- [ ] Bundle identifier set
- [ ] Version number updated
- [ ] Build number incremented
- [ ] Code signing configured
- [ ] Archive created
- [ ] TestFlight build uploaded (optional)

---

## 📝 Notes

Use this space to track issues found during testing:

```
Issue: [Description]
Status: [ ] Open / [ ] Fixed
Steps to Reproduce:
1. 
2. 
3. 

---

Issue: [Description]
Status: [ ] Open / [ ] Fixed
Steps to Reproduce:
1. 
2. 
3. 
```

---

## ✅ Final Sign-Off

- [ ] All critical features tested
- [ ] All blockers resolved
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Ready for production

**Tested By**: ___________________  
**Date**: ___________________  
**Version**: 1.0.0  
**Status**: [ ] Approved / [ ] Needs Work

---

**Once all items are checked, you're ready to deploy! 🚀**
