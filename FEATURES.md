# At-Mark Features Documentation

## 📋 Overview

At-Mark is a comprehensive attendance tracking solution built with React Native CLI. This document details all features and their implementation.

---

## 🎯 Core Features

### 1. Dashboard Screen

**Purpose**: Central hub for managing all classes

**Features**:
- View all created classes in a scrollable list
- Quick class access with tap gesture
- Swipe-to-edit/delete functionality
- Empty state with helpful instructions
- Navigation to Contact/Info screen

**Actions**:
- **Add Class**: Floating action button (FAB) opens class creation
- **Edit Class**: Swipe left to rename class
- **Delete Class**: Swipe left to delete with confirmation dialog
- **View Class**: Tap class item to open details

**Storage Keys Used**:
- `classes` - Array of class names

---

### 2. Add Class Screen

**Purpose**: Create new classes with predefined student batches

**Features**:
- Text input for custom class name (e.g., subject name)
- Grid of predefined batch templates
- Visual batch selection with checkmarks
- Preview of first 10 students in selected batch
- Student count display for each batch

**Predefined Batches**:
- CS Batch A (30 students)
- CS Batch B (28 students)
- IT Batch A (25 students)
- ECE Batch A (32 students)
- Mech Batch A (35 students)
- Civil Batch A (30 students)

**Validation**:
- Class name cannot be empty
- Class name must be unique
- Batch must be selected

**Storage Keys Used**:
- `classes` - Adds new class name
- `students:<className>` - Stores batch students

---

### 3. Class Screen

**Purpose**: Manage individual class and its students

**Features**:
- Display class name and student count
- List all students sorted by name
- Quick action buttons for common tasks
- Inline student editing
- PDF export functionality

**Actions**:
- **Add Student**: Opens form to add new student
- **Take Attendance**: Opens attendance marking screen
- **View History**: Opens historical attendance view
- **Export PDF**: Generates multi-page attendance report
- **Edit Student**: Inline rename with save/cancel
- **Delete Student**: Remove with confirmation
- **View Student Calendar**: Tap student to see attendance calendar

**Storage Keys Used**:
- `students:<className>` - Student list
- `attendanceDates:<className>` - For PDF export

---

### 4. Add Student Screen

**Purpose**: Add individual students to a class

**Features**:
- Student name input field
- Roll number input field
- Form validation
- Success confirmation

**Validation**:
- Name cannot be empty
- Roll number cannot be empty
- Roll number must be unique within class

**Storage Keys Used**:
- `students:<className>` - Adds student to list

---

### 5. Attendance Screen

**Purpose**: Mark daily attendance for all students

**Features**:
- Date picker for selecting attendance date
- Statistics cards (Total, Present, Absent)
- Student list with toggle functionality
- Visual presence indicators
- Save and delete options

**UI/UX**:
- Present students highlighted in green
- Checkmark icon for present students
- Tap to toggle presence status
- Haptic feedback on interactions
- Live statistics update

**Storage Keys Used**:
- `attendance:<className>:<dateISO>` - Sparse presence map
- `attendanceDates:<className>` - Date index

**Data Format**:
```typescript
// Only present students stored
{
  "CSA001": 1,
  "CSA005": 1,
  "CSA012": 1
}
```

---

### 6. Attendance History Screen

**Purpose**: View past attendance records by date

**Features**:
- Date picker for historical dates
- List of students present on selected date
- Statistics summary
- Empty state for dates without records

**Display**:
- Student roll number and name
- Count: Present / Total
- Green checkmark icons
- Friendly empty state

**Storage Keys Used**:
- `attendance:<className>:<dateISO>` - Reads attendance
- `students:<className>` - Maps roll numbers to names

---

### 7. Student Attendance Screen

**Purpose**: Calendar view of individual student attendance

**Features**:
- Monthly calendar with marked dates
- Color-coded attendance (green = present, red = absent)
- Attendance statistics summary
- Percentage calculation

**Calendar Marking**:
- Green background: Student was present
- Red background: Student was absent
- No marking: No class on that date

**Statistics**:
- Total Classes: Count of all attendance dates
- Classes Attended: Count of present dates
- Classes Missed: Count of absent dates
- Attendance Percentage: (Attended / Total) × 100

**Storage Keys Used**:
- `attendanceDates:<className>` - All class dates
- `attendance:<className>:<dateISO>` - Check presence per date

---

### 8. Contact & Info Screen

**Purpose**: Display developer information and app details

**Features**:
- Gradient hero section
- Avatar placeholder
- Skill tags
- Contact action buttons
- About section
- App version footer

**Contact Actions**:
- **Email**: Opens email client
- **Website**: Opens browser to GitHub
- **Phone**: Initiates phone call
- **WhatsApp**: Opens WhatsApp chat
- Haptic feedback on all actions

**Technologies**:
- react-native-linear-gradient for hero
- react-native-haptic-feedback for interactions
- Linking API for external actions

---

## 🗂️ Storage Architecture

### MMKV Implementation

**Why MMKV?**
- 10x faster than AsyncStorage
- Zero-copy direct memory access
- Optional encryption support
- Type-safe with TypeScript wrappers

**Storage Instance**:
```typescript
const storage = new MMKV({
  id: 'atmark',
  // Optional encryption:
  // encryptionKey: 'your-secret-key',
});
```

### Key Patterns

1. **Classes List**
   - Key: `classes`
   - Type: `string[]`
   - Example: `["Math 101", "Physics 201"]`

2. **Students per Class**
   - Key: `students:<className>`
   - Type: `Student[]`
   - Example: `[{name: "John", rollNumber: "CS001"}]`

3. **Attendance Record**
   - Key: `attendance:<className>:<YYYY-MM-DD>`
   - Type: `{[rollNumber: string]: 1}`
   - Example: `{"CS001": 1, "CS003": 1}` (sparse map)

4. **Attendance Date Index**
   - Key: `attendanceDates:<className>`
   - Type: `string[]`
   - Example: `["2024-01-15", "2024-01-16"]`

### Atomic Operations

**Class Rename**:
1. Update `classes` array
2. Move `students:<old>` → `students:<new>`
3. Move all `attendance:<old>:*` → `attendance:<new>:*`
4. Update `attendanceDates:<old>` → `attendanceDates:<new>`
5. Rollback on error

**Delete Class**:
1. Remove from `classes` array
2. Delete `students:<className>`
3. Delete all `attendance:<className>:*`
4. Delete `attendanceDates:<className>`

---

## 📤 PDF Export

### Overview

Generates professional multi-page attendance reports with complete data grids.

### Features

- **Pagination**: Handles large datasets
  - 18 dates per page width
  - 20 students per page height
- **Formatting**:
  - A4 page size
  - Small font for dense data
  - Color-coded cells (green/red)
  - Border grid for clarity
- **Summary Data**:
  - Total students count
  - Total days tracked
  - Per-student present count

### Implementation

1. **Data Aggregation**:
   ```typescript
   dates.forEach(date => {
     const attendance = getAttendance(className, date);
     students.forEach(student => {
       const mark = attendance[student.rollNumber] ? 'P' : 'A';
       data[student.rollNumber].push(mark);
     });
   });
   ```

2. **HTML Generation**:
   - Build table with nested loops
   - Apply inline CSS styles
   - Add page breaks for pagination

3. **PDF Creation**:
   - Use `react-native-html-to-pdf`
   - Convert HTML to PDF file
   - Save to Documents directory

4. **Sharing**:
   - Use `react-native-share`
   - Share via system share sheet
   - Support email, messaging, etc.

### Example Output

```
┌──────────┬────────────┬──────┬──────┬──────┬─────────┐
│ Roll No  │ Name       │ 01-15│ 01-16│ 01-17│ Present │
├──────────┼────────────┼──────┼──────┼──────┼─────────┤
│ CS001    │ John Doe   │  P   │  P   │  A   │   2/3   │
│ CS002    │ Jane Smith │  P   │  A   │  P   │   2/3   │
└──────────┴────────────┴──────┴──────┴──────┴─────────┘
```

---

## 🎨 Theming System

### Color Palette

```typescript
colors: {
  primary: '#4A90E2',      // Main brand color
  secondary: '#50C878',     // Success green
  danger: '#E74C3C',        // Error/delete red
  warning: '#F39C12',       // Edit orange
  
  present: '#27AE60',       // Attendance present
  absent: '#E74C3C',        // Attendance absent
  
  text: '#2C3E50',          // Primary text
  textSecondary: '#7F8C8D', // Secondary text
  textLight: '#BDC3C7',     // Disabled/hint
  
  background: '#F5F6F8',    // App background
  surface: '#FFFFFF',       // Card/surface
  border: '#E0E0E0',        // Borders
}
```

### Spacing Scale

```typescript
spacing: {
  xs: 4,   // Tight spacing
  sm: 8,   // Small gaps
  md: 16,  // Standard spacing
  lg: 24,  // Section gaps
  xl: 32,  // Large sections
  xxl: 48, // Page margins
}
```

### Typography

```typescript
sizes: {
  xs: 12,   // Captions
  sm: 14,   // Secondary text
  md: 16,   // Body text
  lg: 18,   // Subheadings
  xl: 20,   // Section titles
  xxl: 24,  // Screen titles
  xxxl: 32, // Hero text
}
```

---

## 🔄 Navigation Structure

```
Dashboard (headerShown: false)
├── AddClass
├── Class
│   ├── AddStudent
│   ├── Attendance
│   ├── AttendanceHistory
│   └── StudentAttendance
└── ContactInfo
```

### Navigation Library

- `@react-navigation/native` - Core
- `@react-navigation/stack` - Stack navigator
- `react-native-screens` - Native screens
- `react-native-safe-area-context` - Safe areas

---

## 🎭 Animations & Interactions

### Gesture Handler

- Swipe list actions
- Tap handlers with feedback
- Pan gestures for dismissals

### Reanimated

- Smooth transitions
- Layout animations
- Gesture-driven animations

### Haptic Feedback

- Light impact: Button taps
- Success: Save operations
- Warning: Delete confirmations

---

## 📊 Performance Optimizations

1. **MMKV Zero-Copy**:
   - Direct memory access
   - No JSON parse overhead
   - Instant reads/writes

2. **FlatList Optimization**:
   - `initialNumToRender={20}`
   - `maxToRenderPerBatch={10}`
   - `windowSize={21}`
   - Memoized row components

3. **Sparse Attendance Maps**:
   - Store only present students
   - Reduce storage footprint
   - Faster lookups

4. **Date Indexing**:
   - Maintain sorted date arrays
   - Avoid key scanning
   - Quick date lookups

---

## 🔐 Security Considerations

1. **MMKV Encryption**:
   - Optional encryption key
   - Secure local storage
   - Prevent unauthorized access

2. **Data Validation**:
   - Input sanitization
   - Duplicate prevention
   - Type checking

3. **Error Handling**:
   - Try-catch blocks
   - Graceful fallbacks
   - User-friendly messages

---

## 🚀 Future Enhancements

### Planned Features

1. **Cloud Sync**:
   - Firebase/Supabase integration
   - Multi-device support
   - Backup & restore

2. **Advanced Analytics**:
   - Attendance trends
   - Student performance metrics
   - Visual charts/graphs

3. **Notifications**:
   - Low attendance alerts
   - Reminder notifications
   - Custom schedules

4. **Bulk Operations**:
   - Import from CSV/Excel
   - Batch student addition
   - Mass attendance marking

5. **Customization**:
   - Custom batch templates
   - Configurable fields
   - Theme customization

6. **Collaboration**:
   - Multi-teacher support
   - Shared classes
   - Role-based access

---

## 📱 Platform-Specific Features

### Android

- Material Design components
- Native date picker
- Hardware back button support
- APK/AAB builds

### iOS

- Cupertino design patterns
- Native date picker
- Gesture recognizers
- Archive & IPA export

---

## 🧪 Testing Strategy

### Unit Tests

- Storage operations
- Date utilities
- Business logic

### Integration Tests

- Screen navigation
- Data persistence
- API interactions

### E2E Tests (Future)

- User workflows
- Critical paths
- Regression suite

---

## 📚 API Reference

See `src/storage/storage.ts` for complete typed API documentation.

---

**Version**: 1.0.0  
**Last Updated**: October 31, 2025
