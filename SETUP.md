# At-Mark Setup Guide

This guide will help you set up and run the At-Mark attendance tracker app on your machine.

## Prerequisites

### Required Software

1. **Node.js** (>= 20.x)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify: `node --version`

2. **pnpm** (or npm/yarn)
   - Install: `npm install -g pnpm`
   - Verify: `pnpm --version`

3. **React Native CLI**
   - Install: `npm install -g react-native-cli`

### For Android Development

1. **Java Development Kit (JDK 17)**
   - Download from [Oracle](https://www.oracle.com/java/technologies/downloads/) or [OpenJDK](https://openjdk.org/)
   - Set `JAVA_HOME` environment variable

2. **Android Studio**
   - Download from [developer.android.com](https://developer.android.com/studio)
   - Install Android SDK Platform 34
   - Install Android SDK Build-Tools
   - Configure Android SDK path in environment variables:
     - `ANDROID_HOME` = `C:\Users\YourUsername\AppData\Local\Android\Sdk`
     - Add to PATH: `%ANDROID_HOME%\platform-tools`
     - Add to PATH: `%ANDROID_HOME%\tools`

### For iOS Development (macOS only)

1. **Xcode** (latest version)
   - Download from Mac App Store
   - Install Command Line Tools: `xcode-select --install`

2. **CocoaPods**
   - Install: `sudo gem install cocoapods`
   - Verify: `pod --version`

## Project Setup

### 1. Install Dependencies

```powershell
# Navigate to project directory
cd c:\Users\Arpan\Desktop\Native_CLI\atmark

# Install node modules
pnpm install

# For npm users:
# npm install
```

### 2. iOS Setup (macOS only)

```bash
# Navigate to ios folder
cd ios

# Install CocoaPods dependencies
pod install

# Go back to root
cd ..
```

### 3. Android Setup

The Android configuration is already set up. Ensure your emulator is running or device is connected.

#### Start Android Emulator

1. Open Android Studio
2. Go to Tools > Device Manager
3. Create a new Virtual Device (if needed)
4. Start the emulator

#### Or Connect Physical Device

1. Enable Developer Options on your Android device
2. Enable USB Debugging
3. Connect via USB
4. Verify connection: `adb devices`

## Running the App

### Start Metro Bundler

```powershell
# In project root
pnpm start

# or
npm start
```

Keep this terminal running. Metro bundler must be active.

### Run on Android

Open a **new terminal window** and run:

```powershell
# Navigate to project
cd c:\Users\Arpan\Desktop\Native_CLI\atmark

# Run Android
pnpm android

# or
npm run android
```

This will:
1. Build the Android app
2. Install it on your emulator/device
3. Launch the app

### Run on iOS (macOS only)

Open a **new terminal window** and run:

```bash
# Navigate to project
cd /path/to/atmark

# Run iOS
npm run ios

# Or specify simulator
npm run ios -- --simulator="iPhone 15 Pro"
```

## Development Workflow

### Hot Reload

The app supports hot reloading. Changes to JavaScript/TypeScript files will automatically reflect in the running app.

To manually reload:
- **Android**: Press `R` twice, or shake device and select "Reload"
- **iOS**: Press `Cmd + R` in simulator

### Debug Menu

- **Android**: Press `Ctrl + M` (Windows) or `Cmd + M` (macOS) or shake device
- **iOS**: Press `Cmd + D` in simulator or shake device

Useful options:
- Enable Hot Reloading
- Enable Remote JS Debugging
- Show Performance Monitor
- Toggle Inspector

## Troubleshooting

### Common Issues

#### 1. Metro Bundler Port Already in Use

```powershell
# Kill process on port 8081
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# Or start on different port
npm start -- --port=8082
```

#### 2. Android Build Fails

```powershell
# Clean Gradle cache
cd android
./gradlew clean
cd ..

# Clear Metro cache
npm start -- --reset-cache
```

#### 3. Android Emulator Not Detected

```powershell
# List devices
adb devices

# Restart ADB
adb kill-server
adb start-server
```

#### 4. iOS Build Fails (macOS)

```bash
# Clean pods
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..

# Clean build folder
rm -rf ios/build
```

#### 5. TypeScript Errors

```powershell
# Clear TypeScript cache
rm -rf node_modules/.cache

# Reinstall dependencies
rm -rf node_modules
pnpm install
```

#### 6. Native Module Linking Issues

Most modules auto-link, but if you face issues:

```powershell
# Clear watchman (if installed)
watchman watch-del-all

# Clear Metro cache
npm start -- --reset-cache

# Rebuild
# Android
cd android && ./gradlew clean && cd ..
npm run android

# iOS (macOS)
cd ios && pod install && cd ..
npm run ios
```

## Production Build

### Android APK

```powershell
cd android

# Debug APK
./gradlew assembleDebug

# Release APK (requires signing)
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/`

### Android AAB (for Play Store)

```powershell
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/`

### iOS Archive (macOS)

1. Open `ios/atmark.xcworkspace` in Xcode
2. Select "Any iOS Device (arm64)" as build target
3. Product > Archive
4. Use Organizer to export for App Store or Ad Hoc distribution

## Environment Variables

Create a `.env` file in the root (optional):

```env
# MMKV Encryption Key (optional)
MMKV_ENCRYPTION_KEY=your-secret-key-here
```

Update `src/storage/storage.ts` to use the key:

```typescript
const storage = new MMKV({
  id: 'atmark',
  encryptionKey: process.env.MMKV_ENCRYPTION_KEY,
});
```

## Testing

```powershell
# Run tests
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Code Quality

```powershell
# Lint
npm run lint

# Format with Prettier
npx prettier --write "src/**/*.{ts,tsx}"

# Type check
npx tsc --noEmit
```

## Useful Commands

```powershell
# List all npm scripts
npm run

# Check React Native info
npx react-native info

# List Android devices
adb devices

# List iOS simulators (macOS)
xcrun simctl list devices

# Clear everything and rebuild
rm -rf node_modules android/build android/app/build
pnpm install
npm run android
```

## Additional Resources

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [MMKV Documentation](https://github.com/mrousavy/react-native-mmkv)
- [Android Developer Guide](https://developer.android.com/)
- [iOS Developer Guide](https://developer.apple.com/documentation/)

## Support

For issues or questions:
- Check the [GitHub Issues](https://github.com/yourusername/atmark/issues)
- Email: developer@atmark.app

---

**Good luck building with At-Mark! 🚀**
