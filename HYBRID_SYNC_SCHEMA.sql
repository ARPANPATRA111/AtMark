-- ================================================================
-- Hybrid Offline-First + Cloud Sync SQL Schema
-- ================================================================
-- This schema supports:
-- - User-based data isolation with Row Level Security (RLS)
-- - Sync timestamps for conflict resolution
-- - Proper CASCADE deletion for related data
-- - Unique constraints for data integrity
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- DROP EXISTING TABLES (WARNING: Deletes all data!)
-- ================================================================
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS classes CASCADE;

-- ================================================================
-- CLASSES TABLE
-- ================================================================
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique class names per user
  CONSTRAINT unique_user_class_name UNIQUE (user_id, name)
);

-- Index for faster queries
CREATE INDEX idx_classes_user_id ON classes(user_id);
CREATE INDEX idx_classes_created_at ON classes(created_at);

-- ================================================================
-- STUDENTS TABLE
-- ================================================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  roll_number TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique roll numbers per class
  CONSTRAINT unique_class_roll_number UNIQUE (class_id, roll_number)
);

-- Indexes for faster queries
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_roll_number ON students(roll_number);

-- ================================================================
-- ATTENDANCE TABLE
-- ================================================================
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one attendance record per student per date
  CONSTRAINT unique_student_date UNIQUE (student_id, date)
);

-- Indexes for faster queries
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_class_id ON attendance(class_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_class_date ON attendance(class_id, date);

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- CLASSES POLICIES
-- ================================================================

-- Users can view their own classes
CREATE POLICY "Users can view their own classes"
  ON classes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own classes
CREATE POLICY "Users can insert their own classes"
  ON classes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own classes
CREATE POLICY "Users can update their own classes"
  ON classes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own classes
CREATE POLICY "Users can delete their own classes"
  ON classes FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================================
-- STUDENTS POLICIES
-- ================================================================

-- Users can view students in their classes
CREATE POLICY "Users can view students in their classes"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.user_id = auth.uid()
    )
  );

-- Users can insert students into their classes
CREATE POLICY "Users can insert students into their classes"
  ON students FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.user_id = auth.uid()
    )
  );

-- Users can update students in their classes
CREATE POLICY "Users can update students in their classes"
  ON students FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.user_id = auth.uid()
    )
  );

-- Users can delete students from their classes
CREATE POLICY "Users can delete students from their classes"
  ON students FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.user_id = auth.uid()
    )
  );

-- ================================================================
-- ATTENDANCE POLICIES
-- ================================================================

-- Users can view attendance for their classes
CREATE POLICY "Users can view attendance for their classes"
  ON attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = attendance.class_id
      AND classes.user_id = auth.uid()
    )
  );

-- Users can insert attendance for their classes
CREATE POLICY "Users can insert attendance for their classes"
  ON attendance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = attendance.class_id
      AND classes.user_id = auth.uid()
    )
  );

-- Users can update attendance for their classes
CREATE POLICY "Users can update attendance for their classes"
  ON attendance FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = attendance.class_id
      AND classes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = attendance.class_id
      AND classes.user_id = auth.uid()
    )
  );

-- Users can delete attendance from their classes
CREATE POLICY "Users can delete attendance from their classes"
  ON attendance FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = attendance.class_id
      AND classes.user_id = auth.uid()
    )
  );

-- ================================================================
-- AUTO-UPDATE TIMESTAMP TRIGGERS
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for classes
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for students
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for attendance
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- HELPER FUNCTIONS (Optional)
-- ================================================================

-- Function to get all classes for a user with student count
CREATE OR REPLACE FUNCTION get_user_classes_with_counts(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  student_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    COUNT(s.id) as student_count,
    c.created_at,
    c.updated_at
  FROM classes c
  LEFT JOIN students s ON s.class_id = c.id
  WHERE c.user_id = p_user_id
  GROUP BY c.id, c.name, c.created_at, c.updated_at
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get attendance summary for a class
CREATE OR REPLACE FUNCTION get_attendance_summary(p_class_id UUID, p_date DATE)
RETURNS TABLE (
  roll_number TEXT,
  student_name TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.roll_number,
    s.name as student_name,
    COALESCE(a.status, 'absent') as status
  FROM students s
  LEFT JOIN attendance a ON a.student_id = s.id AND a.date = p_date
  WHERE s.class_id = p_class_id
  ORDER BY s.roll_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- COMPLETED!
-- ================================================================
-- Schema created successfully with:
-- ✅ User-based data isolation (RLS)
-- ✅ Sync timestamp columns (created_at, updated_at)
-- ✅ Proper CASCADE deletion
-- ✅ Unique constraints
-- ✅ Performance indexes
-- ✅ Auto-updating timestamps
-- ✅ Helper functions for common queries
-- ================================================================
