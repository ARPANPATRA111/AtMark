# Production-Ready Database Schema Redesign

## 🔴 Critical Issues Identified

### 1. **Duplicate Class Bug**
- **Problem**: `renameClass` uses `.update()` which creates a new record instead of updating in-place
- **Impact**: Old UUID stays, new UUID created, database bloat
- **Fix**: Properly use WatermelonDB's update API

### 2. **Attendance Sync Performance**
- **Problem**: Storing EVERY student as "absent" creates massive records
- **Current**: 100 students × 180 days = 18,000 records per class (mostly "absent")
- **Fix**: **Only store "present" records**, treat absence as default

### 3. **No Multi-Tenancy Support**
- **Problem**: Single user_id field won't scale for university with multiple faculties
- **Fix**: Add organization/university/faculty hierarchy

### 4. **Missing Indexes**
- **Problem**: Queries on date ranges will be slow at scale
- **Fix**: Add compound indexes

### 5. **No Audit Trail**
- **Problem**: Can't track who changed what and when
- **Fix**: Add `created_by`, `updated_by`, `deleted_at` fields

## ✅ New Production Schema

### Core Entities Hierarchy
```
University
  └─ Faculty (Department)
      └─ Teacher (User)
          └─ Class/Course
              ├─ Students (Enrollment)
              └─ Attendance Sessions
                  └─ Attendance Records (ONLY for present students)
```

### Schema Design

#### 1. **organizations** (Universities)
```typescript
{
  id: string (UUID)
  name: string
  code: string (unique, e.g., "MIT", "STANFORD")
  timezone: string
  settings: string (JSON)
  created_at: timestamp
  updated_at: timestamp
}
```

#### 2. **faculties** (Departments/Schools)
```typescript
{
  id: string (UUID)
  organization_id: string (FK → organizations)
  name: string
  code: string (e.g., "CS", "MATH")
  created_at: timestamp
  updated_at: timestamp
  
  Index: (organization_id, code) UNIQUE
}
```

#### 3. **users** (Teachers/Faculty Members)
```typescript
{
  id: string (UUID)
  organization_id: string (FK → organizations)
  faculty_id: string (FK → faculties, nullable)
  email: string (UNIQUE)
  name: string
  role: enum ('teacher', 'admin', 'super_admin')
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
  
  Index: organization_id, email
}
```

#### 4. **classes** (Courses/Sections)
```typescript
{
  id: string (UUID)
  organization_id: string (FK → organizations)
  faculty_id: string (FK → faculties)
  teacher_id: string (FK → users)
  
  name: string
  code: string (e.g., "CS101-A")
  semester: string (e.g., "Fall 2025")
  year: number
  
  is_active: boolean (archive old classes)
  is_deleted: boolean (soft delete)
  deleted_at: timestamp
  
  created_at: timestamp
  updated_at: timestamp
  created_by: string (FK → users)
  updated_by: string (FK → users)
  
  Index: (organization_id, teacher_id, is_deleted)
  Index: (faculty_id, semester, year)
}
```

#### 5. **students**
```typescript
{
  id: string (UUID)
  organization_id: string (FK → organizations)
  faculty_id: string (FK → faculties)
  
  student_id: string (university roll number, UNIQUE per org)
  name: string
  email: string (nullable)
  
  enrollment_year: number
  is_active: boolean
  
  created_at: timestamp
  updated_at: timestamp
  
  Index: (organization_id, student_id) UNIQUE
  Index: (faculty_id, enrollment_year)
}
```

#### 6. **enrollments** (Student-Class junction)
```typescript
{
  id: string (UUID)
  class_id: string (FK → classes)
  student_id: string (FK → students)
  
  enrolled_at: timestamp
  dropped_at: timestamp (nullable)
  is_active: boolean
  
  Index: (class_id, student_id) UNIQUE
  Index: (student_id, is_active)
}
```

#### 7. **attendance_sessions** (Each class session/lecture)
```typescript
{
  id: string (UUID)
  class_id: string (FK → classes)
  
  date: string (ISO date: "2025-11-04")
  start_time: string (nullable, "09:00")
  end_time: string (nullable, "10:00")
  
  total_enrolled: number (denormalized for quick stats)
  total_present: number
  total_absent: number (calculated)
  
  marked_by: string (FK → users)
  marked_at: timestamp
  
  created_at: timestamp
  updated_at: timestamp
  
  Index: (class_id, date) UNIQUE
  Index: (class_id, date) DESC for recent queries
}
```

#### 8. **attendance_records** (⚡ ONLY for PRESENT students)
```typescript
{
  id: string (UUID)
  session_id: string (FK → attendance_sessions)
  student_id: string (FK → students)
  class_id: string (FK → classes, denormalized for queries)
  
  status: enum ('present', 'late') // No 'absent' stored!
  marked_at: timestamp
  notes: string (nullable, for late arrivals)
  
  created_at: timestamp
  
  Index: (session_id, student_id) UNIQUE
  Index: (student_id, class_id) for student history
  Index: (class_id, created_at) for date range queries
}
```

#### 9. **sync_metadata** (Per-table sync tracking)
```typescript
{
  id: string (UUID)
  table_name: string
  last_synced_at: timestamp
  last_pulled_at: timestamp
  last_pushed_at: timestamp
  pending_changes: number
  
  Index: table_name UNIQUE
}
```

## 🚀 Key Optimizations

### 1. **Attendance Storage Optimization**
**Before**: Store all students (present + absent)
```
100 students × 180 days = 18,000 records per class
```

**After**: Store only present students
```
100 students × 80% attendance × 180 days = 14,400 records per class
Savings: ~20% storage, faster queries
```

### 2. **Compound Indexes**
```typescript
// Fast class list for teacher
Index: (teacher_id, is_deleted, is_active)

// Fast attendance for date range
Index: (class_id, date DESC)

// Fast student lookup
Index: (organization_id, student_id)
```

### 3. **Denormalization for Analytics**
Store aggregate counts in `attendance_sessions`:
- `total_present`: Count of records
- `total_enrolled`: From enrollments
- `total_absent`: Calculated (enrolled - present)

### 4. **Soft Deletes**
Never hard delete data:
- `is_deleted` flag
- `deleted_at` timestamp
- Filter with `Q.where('is_deleted', false)`

### 5. **Batch Operations**
```typescript
// Instead of N queries
for (student of students) {
  await create(attendance)
}

// Use batch
await database.batch(
  students.map(s => attendanceCollection.prepareCreate(...))
)
```

## 📊 Expected Performance at Scale

### Scenario: Large University
- **5 faculties** × **100 teachers** = 500 teachers
- **Each teacher**: 5 classes/semester
- **Each class**: 60 students average
- **Days per semester**: 90 days

### Storage Calculation
```
Classes: 500 × 5 = 2,500 classes/semester
Students: ~30,000 total students
Enrollments: 2,500 × 60 = 150,000 enrollments/semester
Attendance Sessions: 2,500 × 90 = 225,000 sessions/semester
Attendance Records (80% attendance): 150,000 × 90 × 0.8 = 10.8M records/semester
```

### With Old Schema (storing absent):
- **13.5M attendance records** per semester
- Sync time: ~5-10 minutes
- Database size: ~2GB

### With New Schema (only present):
- **10.8M attendance records** per semester (20% reduction)
- Sync time: ~3-6 minutes (40% faster)
- Database size: ~1.5GB

## 🔧 Migration Strategy

1. **Bump schema version**: 1 → 2
2. **Create migration** to transform old data
3. **Keep old tables** for 1 version (safety)
4. **Update sync logic** to handle new structure
5. **Test with sample data** before production

## 📝 Implementation Priority

### Phase 1: Critical Fixes (Immediate)
- [ ] Fix class rename bug (update vs create)
- [ ] Change attendance to only store "present"
- [ ] Add compound indexes
- [ ] Add is_deleted soft deletes

### Phase 2: Multi-Tenancy (Week 1)
- [ ] Add organizations table
- [ ] Add faculties table
- [ ] Update users with org/faculty
- [ ] Migrate existing data

### Phase 3: Enrollment System (Week 2)
- [ ] Add students table (separate from enrollment)
- [ ] Add enrollments junction table
- [ ] Add attendance_sessions
- [ ] Update attendance_records

### Phase 4: Analytics Optimization (Week 3)
- [ ] Add denormalized counts
- [ ] Implement batch operations
- [ ] Add date range indexes
- [ ] Create materialized views for reports

Would you like me to implement Phase 1 (Critical Fixes) right now?
