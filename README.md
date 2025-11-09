# AtMark - Attendance Tracker

A production-ready attendance tracking application built with React Native CLI, featuring WatermelonDB for robust offline-first data management, Supabase sync for multi-device support, and a beautiful modern UI.

![Alt](./design.gif)

## 🚀 Features

### Core Functionality
- **Class Management**: Create, rename, and delete classes with PDf import support
- **Student Management**: Add individual students or import entire batches from Excel files
- **Attendance Tracking**: Quick and intuitive attendance marking with calendar date selection
- **Attendance History**: Visual calendar view showing individual student attendance patterns
- **Multi-Device Sync**: Cloud sync via Supabase - same account, same data across all devices
- **PDF Export**: Export attendance reports in PDF format
- **Search & Filter**: Quickly find students with real-time search functionality

### Technical Highlights
- **Offline-First**: WatermelonDB provides SQLite-based local storage with full offline capability
- **Cloud Sync**: Automatic conflict resolution and multi-device data synchronization via Supabase
- **Soft Deletes**: Recoverable deletion with cascade triggers for data integrity
- **Optimistic UI**: Instant feedback with background data persistence
- **Haptic Feedback**: Enhanced UX with tactile responses throughout the app
- **Beautiful UI**: Modern design with smooth animations and intuitive interactions

## 📱 Tech Stack

### Core Framework
- **React Native CLI**: 0.82.x
- **TypeScript**: Full type safety across the codebase
- **Navigation**: @react-navigation/native + @react-navigation/stack

### Data & Storage
- **Database**: @nozbe/watermelondb (SQLite-based reactive database)
- **Cloud Backend**: @supabase/supabase-js (Authentication, PostgreSQL sync)
- **Local Storage**: @react-native-async-storage/async-storage
- **Network**: @react-native-community/netinfo

### UI Components
- **Icons**: react-native-vector-icons (Material Icons)
- **Gradients**: react-native-linear-gradient
- **Calendars**: react-native-calendars
- **Date Picker**: @react-native-community/datetimepicker
- **Gestures**: react-native-gesture-handler
- **Safe Areas**: react-native-safe-area-context

### Import/Export
- **Excel Import**: xlsx + react-native-fs + @react-native-documents/picker
- **CSV Export**: Native JavaScript + react-native-share
- **File System**: react-native-fs

### Developer Experience
- **Haptics**: react-native-haptic-feedback
- **Utilities**: date-fns (date formatting)
- **Environment**: react-native-dotenv

## 🛠️ Installation

> **Note**: Make sure you have completed the [React Native Environment Setup](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
