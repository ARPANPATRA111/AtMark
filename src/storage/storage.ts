import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import { Class, Student, Attendance } from '../database/models';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_SESSION_KEY = '@user_session';

export type AttendanceMap = { [rollNumber: string]: 1 };

export interface StudentData {
  id: string; // UUID from WatermelonDB
  name: string;
  rollNumber: string;
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await AsyncStorage.getItem(USER_SESSION_KEY);
    if (session) {
      const { userId } = JSON.parse(session);
      return userId || null;
    }
  } catch (error) {
    console.error('[Storage] Error getting user ID:', error);
  }
  return null;
}

export async function getClasses(): Promise<string[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    const classesCollection = database.collections.get<Class>('classes');
    const classes = await classesCollection
      .query(
        Q.where('user_id', userId),
        Q.where('is_deleted', false), // Only non-deleted classes
        Q.sortBy('created_at', Q.asc)
      )
      .fetch();
    return classes.map(c => c.name);
  } catch (error) {
    console.error('[Storage] Error loading classes:', error);
    return [];
  }
}

export function observeClasses() {
  return database.collections.get<Class>('classes').query().observe();
}

export async function addClass(name: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not logged in');
  const classesCollection = database.collections.get<Class>('classes');
  const existing = await classesCollection
    .query(
      Q.where('user_id', userId),
      Q.where('name', name),
      Q.where('is_deleted', false) // Check only active classes
    )
    .fetch();
  if (existing.length > 0) throw new Error(`Class "${name}" already exists`);
  await database.write(async () => {
    await classesCollection.create((classRecord: any) => {
      classRecord.name = name;
      classRecord.userId = userId;
      classRecord.isDeleted = false; // Initialize soft delete flag
    });
  });
}

export async function renameClass(oldName: string, newName: string): Promise<void> {
  if (!oldName || !newName) throw new Error('Class names cannot be empty');
  if (oldName === newName) return;
  
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not logged in');
  
  const classesCollection = database.collections.get<Class>('classes');
  
  // Check if new name conflicts with existing active class
  const existing = await classesCollection
    .query(
      Q.where('user_id', userId),
      Q.where('name', newName),
      Q.where('is_deleted', false)
    )
    .fetch();
  if (existing.length > 0) throw new Error(`Class "${newName}" already exists`);
  
  // Find the class to rename (only active classes)
  const classToRename = await classesCollection
    .query(
      Q.where('user_id', userId),
      Q.where('name', oldName),
      Q.where('is_deleted', false)
    )
    .fetch();
  if (classToRename.length === 0) throw new Error(`Class "${oldName}" does not exist`);
  
  // CRITICAL FIX: Use update() within database.write() - this updates in-place, doesn't create new record
  await database.write(async () => {
    await classToRename[0].update((classRecord: any) => {
      classRecord.name = newName;
      // updatedAt will be automatically set by WatermelonDB
    });
  });
  
  console.log(`[Storage] Successfully renamed class from "${oldName}" to "${newName}"`);
}

export async function deleteClass(name: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not logged in');
  
  const classesCollection = database.collections.get<Class>('classes');
  const classToDelete = await classesCollection
    .query(
      Q.where('user_id', userId),
      Q.where('name', name),
      Q.where('is_deleted', false)
    )
    .fetch();
  if (classToDelete.length === 0) throw new Error(`Class "${name}" does not exist`);
  
  const classRecord = classToDelete[0];
  
  await database.write(async () => {
    // Soft delete students
    const studentsCollection = database.collections.get<Student>('students');
    const students = await studentsCollection
      .query(Q.where('class_id', classRecord.id), Q.where('is_deleted', false))
      .fetch();
    
    for (const student of students) {
      await student.update((s: any) => {
        s.isDeleted = true;
        s.deletedAt = new Date();
      });
    }
    
    // Soft delete class
    await classRecord.update((c: any) => {
      c.isDeleted = true;
      c.deletedAt = new Date();
    });
    
    // Note: Attendance records stay for historical data
    console.log(`[Storage] Soft deleted class "${name}" and ${students.length} students`);
  });
}

export async function getStudents(className: string): Promise<StudentData[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    
    const classesCollection = database.collections.get<Class>('classes');
    const classRecords = await classesCollection
      .query(
        Q.where('user_id', userId),
        Q.where('name', className),
        Q.where('is_deleted', false)
      )
      .fetch();
    if (classRecords.length === 0) return [];
    
    const studentsCollection = database.collections.get<Student>('students');
    const students = await studentsCollection
      .query(
        Q.where('class_id', classRecords[0].id),
        Q.where('is_deleted', false) // Only active students
      )
      .fetch();
    
    return students
      .map(s => ({ id: s.id, name: s.name, rollNumber: s.rollNumber }))
      // Sort alphabetically by student name to keep UI consistent
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('[Storage] Error loading students:', error);
    return [];
  }
}

export async function setStudents(className: string, list: Array<Omit<StudentData, 'id'>>): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not logged in');
  
  const classesCollection = database.collections.get<Class>('classes');
  const classRecords = await classesCollection
    .query(
      Q.where('user_id', userId),
      Q.where('name', className),
      Q.where('is_deleted', false)
    )
    .fetch();
  if (classRecords.length === 0) throw new Error(`Class "${className}" does not exist`);
  
  const classId = classRecords[0].id;
  const studentsCollection = database.collections.get<Student>('students');
  
  await database.write(async () => {
    // Soft delete existing students
    const existingStudents = await studentsCollection
      .query(Q.where('class_id', classId), Q.where('is_deleted', false))
      .fetch();
    
    for (const student of existingStudents) {
      await student.update((s: any) => {
        s.isDeleted = true;
        s.deletedAt = new Date();
      });
    }
    // Create new students with batch operation for performance
    const createOperations = list.map(studentData =>
      studentsCollection.prepareCreate((student: any) => {
        student.classId = classId;
        student.rollNumber = studentData.rollNumber;
        student.name = studentData.name;
        student.isDeleted = false;
      })
    );
    
    await database.batch(...createOperations);
  });
}

export async function addStudent(className: string, studentData: Omit<StudentData, 'id'>): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not logged in');
  
  const classesCollection = database.collections.get<Class>('classes');
  const classRecords = await classesCollection
    .query(
      Q.where('user_id', userId),
      Q.where('name', className),
      Q.where('is_deleted', false)
    )
    .fetch();
  if (classRecords.length === 0) throw new Error(`Class "${className}" does not exist`);
  
  const studentsCollection = database.collections.get<Student>('students');
  const existingStudent = await studentsCollection
    .query(
      Q.where('class_id', classRecords[0].id),
      Q.where('roll_number', studentData.rollNumber),
      Q.where('is_deleted', false)
    )
    .fetch();
  if (existingStudent.length > 0) {
    throw new Error(`Student with roll number "${studentData.rollNumber}" already exists in this class`);
  }
  
  await database.write(async () => {
    await studentsCollection.create((student: any) => {
      student.classId = classRecords[0].id;
      student.rollNumber = studentData.rollNumber;
      student.name = studentData.name;
      student.isDeleted = false;
    });
  });
}

export async function updateStudentName(className: string, rollNumber: string, newName: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not logged in');
  
  const classesCollection = database.collections.get<Class>('classes');
  const classRecords = await classesCollection
    .query(
      Q.where('user_id', userId),
      Q.where('name', className),
      Q.where('is_deleted', false)
    )
    .fetch();
  if (classRecords.length === 0) return;
  const studentsCollection = database.collections.get<Student>('students');
  const students = await studentsCollection
    .query(
      Q.where('class_id', classRecords[0].id),
      Q.where('roll_number', rollNumber),
      Q.where('is_deleted', false)
    )
    .fetch();
  
  if (students.length > 0) {
    await database.write(async () => {
      await students[0].update((student: any) => {
        student.name = newName;
      });
    });
  }
}

export async function deleteStudent(className: string, rollNumber: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not logged in');
  
  const classesCollection = database.collections.get<Class>('classes');
  const classRecords = await classesCollection
    .query(
      Q.where('user_id', userId),
      Q.where('name', className),
      Q.where('is_deleted', false)
    )
    .fetch();
  if (classRecords.length === 0) return;
  
  const studentsCollection = database.collections.get<Student>('students');
  const students = await studentsCollection
    .query(
      Q.where('class_id', classRecords[0].id),
      Q.where('roll_number', rollNumber),
      Q.where('is_deleted', false)
    )
    .fetch();
  
  if (students.length > 0) {
    await database.write(async () => {
      // Soft delete
      await students[0].update((student: any) => {
        student.isDeleted = true;
        student.deletedAt = new Date();
      });
    });
  }
}

export async function saveAttendance(className: string, dateISO: string, presentMap: AttendanceMap): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not logged in');
  
  const classesCollection = database.collections.get<Class>('classes');
  const classRecords = await classesCollection
    .query(
      Q.where('user_id', userId),
      Q.where('name', className),
      Q.where('is_deleted', false)
    )
    .fetch();
  if (classRecords.length === 0) throw new Error(`Class "${className}" does not exist`);
  
  const classId = classRecords[0].id;
  const studentsCollection = database.collections.get<Student>('students');
  const students = await studentsCollection
    .query(Q.where('class_id', classId), Q.where('is_deleted', false))
    .fetch();
  
  const attendanceCollection = database.collections.get<Attendance>('attendance');
  
  await database.write(async () => {
    // Delete existing attendance for this date
    const existingAttendance = await attendanceCollection
      .query(Q.where('class_id', classId), Q.where('date', dateISO))
      .fetch();
    
    // Use batch delete for performance
    const deleteOperations = existingAttendance.map(att => att.prepareMarkAsDeleted());
    
    // ⚡ CRITICAL OPTIMIZATION: Only create records for PRESENT students!
    // Absent students have NO record - absence is implicit
    const createOperations = students
      .filter(student => presentMap[student.rollNumber] === 1) // Only present students
      .map(student => 
        attendanceCollection.prepareCreate((attendance: any) => {
          attendance.studentId = student.id;
          attendance.classId = classId;
          attendance.date = dateISO;
          attendance.status = 'present';
        })
      );
    
    // Batch all operations for atomic execution
    await database.batch(...deleteOperations, ...createOperations);
    
    const presentCount = createOperations.length;
    const totalCount = students.length;
    console.log(`[Storage] Saved attendance: ${presentCount}/${totalCount} present (${totalCount - presentCount} absent by default)`);
  });
}

export async function getAttendance(className: string, dateISO: string): Promise<AttendanceMap> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return {};
    
    const classesCollection = database.collections.get<Class>('classes');
    const classRecords = await classesCollection
      .query(
        Q.where('user_id', userId),
        Q.where('name', className),
        Q.where('is_deleted', false)
      )
      .fetch();
    if (classRecords.length === 0) return {};
    
    const classId = classRecords[0].id;
    const attendanceCollection = database.collections.get<Attendance>('attendance');
    const attendanceRecords = await attendanceCollection
      .query(Q.where('class_id', classId), Q.where('date', dateISO))
      .fetch();
    
    const attendanceMap: AttendanceMap = {};
    
    // ⚡ OPTIMIZATION: Only records that exist are "present"
    // If student has no record for this date, they're absent by default
    for (const att of attendanceRecords) {
      const studentsCollection = database.collections.get<Student>('students');
      const students = await studentsCollection.find(att.studentId);
      // Mark as present in the map (1 = present, undefined/missing = absent)
      attendanceMap[students.rollNumber] = 1;
    }
    
    return attendanceMap;
  } catch (error) {
    console.error('[Storage] Error loading attendance:', error);
    return {};
  }
}

export async function getAttendanceDates(className: string): Promise<string[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    
    const classesCollection = database.collections.get<Class>('classes');
    const classRecords = await classesCollection
      .query(
        Q.where('user_id', userId),
        Q.where('name', className),
        Q.where('is_deleted', false)
      )
      .fetch();
    if (classRecords.length === 0) return [];
    
    const classId = classRecords[0].id;
    const attendanceCollection = database.collections.get<Attendance>('attendance');
    const attendanceRecords = await attendanceCollection
      .query(Q.where('class_id', classId))
      .fetch();
    
    const dates = new Set(attendanceRecords.map(a => a.date));
    return Array.from(dates).sort((a, b) => b.localeCompare(a)); // Newest first
  } catch (error) {
    console.error('[Storage] Error loading attendance dates:', error);
    return [];
  }
}

export async function deleteAttendance(className: string, dateISO: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('User not logged in');
  
  const classesCollection = database.collections.get<Class>('classes');
  const classRecords = await classesCollection
    .query(
      Q.where('user_id', userId),
      Q.where('name', className),
      Q.where('is_deleted', false)
    )
    .fetch();
  if (classRecords.length === 0) return;
  const classId = classRecords[0].id;
  const attendanceCollection = database.collections.get<Attendance>('attendance');
  const attendanceRecords = await attendanceCollection
    .query(Q.where('class_id', classId), Q.where('date', dateISO))
    .fetch();
  await database.write(async () => {
    for (const att of attendanceRecords) {
      await att.markAsDeleted();
    }
  });
}

export async function clearAllData(): Promise<void> {
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
}

export async function getAllKeys(): Promise<string[]> {
  return [];
}
