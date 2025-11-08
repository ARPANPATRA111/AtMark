-- =====================================================
-- PRODUCTION-READY SUPABASE SCHEMA v2.0
-- Optimized for University-Scale Attendance System
-- =====================================================

-- Drop existing tables (for clean migration)
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS classes CASCADE;

-- =====================================================
-- CLASSES TABLE (with soft deletes)
-- =====================================================
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    
    -- Soft delete fields
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    synced_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT unique_active_class_name UNIQUE (user_id, name, is_deleted),
    CONSTRAINT valid_delete CHECK (
        (is_deleted = false AND deleted_at IS NULL) OR
        (is_deleted = true AND deleted_at IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_classes_user_active ON classes(user_id, is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_classes_updated ON classes(updated_at DESC);

-- RLS Policies
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own classes"
    ON classes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own classes"
    ON classes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own classes"
    ON classes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own classes"
    ON classes FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- STUDENTS TABLE (with soft deletes)
-- =====================================================
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    roll_number TEXT NOT NULL,
    name TEXT NOT NULL,
    
    -- Soft delete fields
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    synced_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT unique_roll_number UNIQUE (class_id, roll_number, is_deleted),
    CONSTRAINT valid_delete CHECK (
        (is_deleted = false AND deleted_at IS NULL) OR
        (is_deleted = true AND deleted_at IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_roll ON students(roll_number);
CREATE INDEX idx_students_active ON students(class_id, is_deleted) WHERE is_deleted = false;

-- RLS Policies
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view students in their classes"
    ON students FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = students.class_id
            AND classes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert students in their classes"
    ON students FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = students.class_id
            AND classes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update students in their classes"
    ON students FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = students.class_id
            AND classes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete students in their classes"
    ON students FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = students.class_id
            AND classes.user_id = auth.uid()
        )
    );

-- =====================================================
-- ATTENDANCE TABLE (ONLY stores "present" records!)
-- ⚡ CRITICAL OPTIMIZATION: No "absent" records stored
-- =====================================================
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Status: ONLY 'present' or 'late' - NO 'absent'!
    status TEXT NOT NULL CHECK (status IN ('present', 'late')),
    
    -- Optional notes for special cases (e.g., late arrival reason)
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    synced_at TIMESTAMPTZ,
    
    -- Constraints: One attendance record per student per day per class
    CONSTRAINT unique_attendance UNIQUE (student_id, class_id, date)
);

-- Indexes for performance (critical for large-scale queries)
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_class ON attendance(class_id);
CREATE INDEX idx_attendance_date ON attendance(date DESC);
CREATE INDEX idx_attendance_class_date ON attendance(class_id, date DESC); -- Compound index
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date DESC); -- For student history

-- RLS Policies
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attendance for their classes"
    ON attendance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = attendance.class_id
            AND classes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert attendance for their classes"
    ON attendance FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = attendance.class_id
            AND classes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update attendance for their classes"
    ON attendance FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = attendance.class_id
            AND classes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete attendance for their classes"
    ON attendance FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = attendance.class_id
            AND classes.user_id = auth.uid()
        )
    );

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATING updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ANALYTICS VIEWS (for admin dashboard)
-- =====================================================

-- View: Attendance summary by class and date
CREATE OR REPLACE VIEW attendance_summary AS
SELECT 
    c.id AS class_id,
    c.name AS class_name,
    c.user_id,
    att.date,
    COUNT(DISTINCT s.id) AS total_students,
    COUNT(DISTINCT att.student_id) AS present_count,
    COUNT(DISTINCT s.id) - COUNT(DISTINCT att.student_id) AS absent_count,
    ROUND(
        CAST(COUNT(DISTINCT att.student_id) AS NUMERIC) / NULLIF(COUNT(DISTINCT s.id), 0) * 100,
        2
    ) AS attendance_percentage
FROM classes c
LEFT JOIN students s ON s.class_id = c.id AND s.is_deleted = false
LEFT JOIN attendance att ON att.class_id = c.id AND att.student_id = s.id
WHERE c.is_deleted = false
GROUP BY c.id, c.name, c.user_id, att.date
HAVING att.date IS NOT NULL
ORDER BY att.date DESC, c.name;

-- View: Student attendance history
CREATE OR REPLACE VIEW student_attendance_history AS
SELECT 
    s.id AS student_id,
    s.name AS student_name,
    s.roll_number,
    c.id AS class_id,
    c.name AS class_name,
    att.date,
    COALESCE(att.status, 'absent') AS status, -- Absence is implicit!
    att.notes
FROM students s
INNER JOIN classes c ON c.id = s.class_id
LEFT JOIN attendance att ON att.student_id = s.id AND att.class_id = c.id
WHERE s.is_deleted = false AND c.is_deleted = false
ORDER BY s.name, att.date DESC;

-- View: Class statistics
CREATE OR REPLACE VIEW class_statistics AS
SELECT 
    c.id AS class_id,
    c.name AS class_name,
    c.user_id,
    COUNT(DISTINCT s.id) AS total_students,
    COUNT(DISTINCT att.date) AS days_recorded,
    COUNT(att.id) AS total_present_records,
    ROUND(
        CAST(COUNT(att.id) AS NUMERIC) / NULLIF(
            COUNT(DISTINCT s.id) * COUNT(DISTINCT att.date), 0
        ) * 100,
        2
    ) AS average_attendance_percentage
FROM classes c
LEFT JOIN students s ON s.class_id = c.id AND s.is_deleted = false
LEFT JOIN attendance att ON att.class_id = c.id AND att.student_id = s.id
WHERE c.is_deleted = false
GROUP BY c.id, c.name, c.user_id
ORDER BY c.name;

-- =====================================================
-- PERFORMANCE NOTES
-- =====================================================

-- Expected Performance at University Scale:
-- - 500 teachers × 5 classes = 2,500 classes/semester
-- - 2,500 classes × 60 students = 150,000 enrollments
-- - 150,000 × 90 days × 80% attendance = ~10.8M records/semester
--
-- With OLD schema (storing absent): 13.5M records
-- With NEW schema (only present): 10.8M records
-- SAVINGS: 2.7M records (20% reduction)
--
-- Query Performance:
-- - Single class attendance for date: ~1ms (indexed)
-- - Date range query (30 days): ~50ms (compound index)
-- - Student attendance history: ~100ms (indexed)
-- - Analytics views: ~500ms (materialized recommended for production)

-- =====================================================
-- MIGRATION NOTES
-- =====================================================

-- To migrate from v1 to v2:
-- 1. Run this schema on Supabase dashboard
-- 2. Update app to schema version 2
-- 3. Clear local database or run migration
-- 4. Sync data from app to cloud
-- 5. Verify data in Supabase dashboard

COMMENT ON TABLE classes IS 'Stores classes/courses taught by teachers. Uses soft deletes.';
COMMENT ON TABLE students IS 'Stores students enrolled in classes. Uses soft deletes.';
COMMENT ON TABLE attendance IS 'Stores ONLY present attendance records. Absence is implicit (no record = absent).';
COMMENT ON COLUMN attendance.status IS 'Only "present" or "late" - NO "absent" values stored!';
