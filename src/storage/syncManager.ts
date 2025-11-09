/**
 * Sync Manager - WatermelonDB Synchronization
 */

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../database';
import { synchronize } from '@nozbe/watermelondb/sync';
import { supabase, getCurrentUserId } from '../config/supabase';

const LAST_SYNC_KEY = '@last_sync_watermelon';

export class SyncManager {
  private static instance: SyncManager;
  private isSyncing = false;
  private isOnline = false;
  private syncCallbacks: Set<(isSyncing: boolean) => void> = new Set();
  private unsubscribeNetwork?: () => void;

  private constructor() {
    this.initializeNetworkListener();
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  private initializeNetworkListener() {
    this.unsubscribeNetwork = NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      console.log('[SyncManager] Network:', this.isOnline ? 'Online' : 'Offline');
      
      // ⚠️ REMOVED AUTO-SYNC: Only sync when user presses sync button
      // User has full control over when data is sent to Supabase
    });
  }

  async syncToCloud(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    const userId = await getCurrentUserId();
    if (!userId) return;

    this.setSyncingStatus(true);
    
    try {
      // For now, WatermelonDB's sync protocol needs backend implementation
      // Instead, we'll do a simple one-way push to Supabase
      await this.pushToSupabase(userId);
      
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    } catch (error) {
      console.error('[Sync] Failed:', error);
      throw error;
    } finally {
      this.setSyncingStatus(false);
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return timestamp ? new Date(timestamp) : null;
  }

  async getPendingChangesCount(): Promise<number> {
    return 0;
  }

  private setSyncingStatus(isSyncing: boolean) {
    this.isSyncing = isSyncing;
    this.syncCallbacks.forEach(cb => cb(isSyncing));
  }

  getSyncingStatus(): boolean {
    return this.isSyncing;
  }

  onSyncStatusChange(callback: (isSyncing: boolean) => void): () => void {
    this.syncCallbacks.add(callback);
    callback(this.isSyncing);
    return () => this.syncCallbacks.delete(callback);
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Push local WatermelonDB data to Supabase
   * ⚡ Pushes both active AND deleted records to sync deletions across devices
   */
  private async pushToSupabase(userId: string): Promise<void> {
    try {
      const Q = await import('@nozbe/watermelondb/QueryDescription');
      
      console.log('[Sync] 🚀 Pushing local data to Supabase for user:', userId);
      
      // Get ALL local classes for this user (including deleted ones to sync deletions)
      const classesCollection = database.collections.get('classes');
      const localClasses = await classesCollection
        .query(Q.where('user_id', userId))
        .fetch();
      
      console.log(`[Sync] 📚 Found ${localClasses.length} total local classes (including deleted) to sync`);
      
      if (localClasses.length === 0) {
        console.log('[Sync] ⚠️ No classes found in local database. Have you created any classes?');
        return;
      }
      
      for (const classRecord of localClasses) {
        const classData: any = {
          id: classRecord.id,
          user_id: userId,
          name: (classRecord as any).name,
          is_deleted: (classRecord as any).isDeleted,
          deleted_at: (classRecord as any).deletedAt?.toISOString() || null,
          created_at: (classRecord as any).createdAt.toISOString(),
          updated_at: (classRecord as any).updatedAt.toISOString(),
        };

        // Handle potential duplicate name conflict (23505 error)
        // If upsert by id fails due to unique constraint on name, reconcile
        const { error: classError } = await supabase
          .from('classes')
          .upsert(classData, { onConflict: 'id' });
        
        if (classError) {
          // Check if it's a duplicate name error (23505)
          if (classError.code === '23505' && classError.message.includes('unique_active_class_name')) {
            console.warn(`[Sync] ⚠️ Duplicate class name "${classData.name}" detected. Attempting reconciliation...`);
            
            // Query for existing cloud class with same name
            const { data: existingClasses, error: queryError } = await supabase
              .from('classes')
              .select('id')
              .eq('user_id', userId)
              .eq('name', classData.name)
              .eq('is_deleted', false)
              .limit(1);
            
            if (!queryError && existingClasses && existingClasses.length > 0) {
              const cloudClassId = existingClasses[0].id;
              console.log(`[Sync] 🔄 Found existing cloud class with same name. Cloud ID: ${cloudClassId}, Local ID: ${classRecord.id}`);
              console.log('[Sync] 💡 TIP: You may have duplicate classes. Consider using cloud ID or merging data.');
              // Skip this class to avoid conflict; in production you'd want merge logic here
              continue;
            }
          }
          
          console.error('[Sync] Error syncing class:', classError);
          continue;
        }
        
        // Sync ALL students for this class (including deleted to propagate soft-deletes)
        const studentsCollection = database.collections.get('students');
        const students = await studentsCollection
          .query(Q.where('class_id', classRecord.id))
          .fetch();
        
        console.log(`[Sync] Syncing ${students.length} total students (incl. deleted) for class ${(classRecord as any).name}`);
        
        for (const student of students) {
          const { error: studentError } = await supabase
            .from('students')
            .upsert({
              id: student.id,
              class_id: classRecord.id,
              roll_number: (student as any).rollNumber,
              name: (student as any).name,
              is_deleted: (student as any).isDeleted,
              deleted_at: (student as any).deletedAt?.toISOString() || null,
              created_at: (student as any).createdAt.toISOString(),
              updated_at: (student as any).updatedAt.toISOString(),
            }, { onConflict: 'id' });
          
          if (studentError) {
            console.error('[Sync] Error syncing student:', studentError);
          }
        }
        
        // ⚡ Sync attendance for this class (including any soft-deleted records)
        // Only "present" records are stored locally - no "absent" records!
        const attendanceCollection = database.collections.get('attendance');
        const attendanceRecords = await attendanceCollection
          .query(Q.where('class_id', classRecord.id))
          .fetch();
        
        console.log(`[Sync] Syncing ${attendanceRecords.length} attendance records (present students + any deleted)`);
        
        for (const attendance of attendanceRecords) {
          const attendanceData: any = {
            id: attendance.id,
            student_id: (attendance as any).studentId,
            class_id: classRecord.id,
            date: (attendance as any).date,
            status: (attendance as any).status,
            notes: (attendance as any).notes,
            created_at: (attendance as any).createdAt.toISOString(),
            updated_at: (attendance as any).updatedAt.toISOString(),
          };
          
          // Include is_deleted if your server schema has it (optional enhancement)
          // attendanceData.is_deleted = (attendance as any).isDeleted || false;
          // attendanceData.deleted_at = (attendance as any).deletedAt?.toISOString() || null;
          
          const { error: attendanceError } = await supabase
            .from('attendance')
            .upsert(attendanceData, { onConflict: 'id' });
          
          if (attendanceError) {
            console.error('[Sync] Error syncing attendance:', attendanceError);
          }
        }
      }
      
      console.log('[Sync] Supabase push completed');
    } catch (error) {
      console.error('[Sync] Error pushing to Supabase:', error);
      throw error;
    }
  }

  /**
   * 📥 Fetch classes from Supabase on login
   * This is called ONLY when user logs in to load their cloud data
   */
  async fetchClassesFromSupabase(userId: string): Promise<void> {
    try {
      console.log('[Sync] 🔄 Fetching classes from Supabase for user:', userId);
      console.log('[Sync] Network status:', this.isOnline ? 'Online' : 'Offline (attempting anyway)');
      
      const Q = await import('@nozbe/watermelondb/QueryDescription');
      
      // --- Migration: attach orphan local classes (created with old schema) to this user
      try {
        const classesCollectionLocal = database.collections.get('classes');
        const allLocalClasses = await classesCollectionLocal.query().fetch();
        let orphanCount = 0;
        await database.write(async () => {
          for (const lc of allLocalClasses) {
            // Some older records may be missing userId; if so, attribute them to the current user
            if (!(lc as any).userId) {
              await lc.update((r: any) => {
                r.userId = userId;
              });
              orphanCount++;
            }
          }
        });
        if (orphanCount > 0) {
          console.log(`[Sync] 🩹 Migrated ${orphanCount} local classes to user ${userId}`);
        }
      } catch (migrationErr) {
        console.warn('[Sync] Migration step failed (non-fatal):', migrationErr);
      }

      // Fetch classes from Supabase
      const { data: cloudClasses, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', false);
      
      if (classesError) {
        console.error('[Sync] ❌ Error fetching classes:', classesError);
        throw classesError;
      }
      
      console.log(`[Sync] ✅ Found ${cloudClasses?.length || 0} classes in Supabase`);
      console.log('[Sync] Cloud classes:', JSON.stringify(cloudClasses, null, 2));
      
      if (!cloudClasses || cloudClasses.length === 0) {
        console.log('[Sync] ℹ️ No cloud data to fetch - your account has no classes in Supabase yet.');
        console.log('[Sync] 💡 TIP: On your old device, press the "Sync to Cloud" button to upload your data.');
        return;
      }
      
      console.log('[Sync] 📝 Starting database write transaction...');
      // Sync cloud data to local WatermelonDB
      await database.write(async () => {
        const classesCollection = database.collections.get('classes');
        const studentsCollection = database.collections.get('students');
        const attendanceCollection = database.collections.get('attendance');
        
        for (const cloudClass of cloudClasses) {
          console.log(`[Sync] 📚 Processing class: ${cloudClass.name}`);
          
          // Check if class already exists locally
          try {
            const localClass = await classesCollection.find(cloudClass.id);
            // Update existing class (don't update createdAt/updatedAt - they're readonly)
            await localClass.update((record: any) => {
              record.name = cloudClass.name;
              // updatedAt will be set automatically by WatermelonDB
            });
            console.log(`[Sync] ♻️ Updated existing class: ${cloudClass.name}`);
          } catch {
            // Create new class if doesn't exist
            await classesCollection.create((record: any) => {
              record._raw.id = cloudClass.id;
              record.userId = userId;
              record.name = cloudClass.name;
              record.isDeleted = false;
              // createdAt and updatedAt will be set automatically by WatermelonDB
            });
            console.log(`[Sync] ➕ Created new class: ${cloudClass.name}`);
          }
          
          // Fetch students for this class
          const { data: cloudStudents, error: studentsError } = await supabase
            .from('students')
            .select('*')
            .eq('class_id', cloudClass.id)
            .eq('is_deleted', false);
          
          if (studentsError) {
            console.error(`[Sync] ❌ Error fetching students for class ${cloudClass.name}:`, studentsError);
          } else {
            console.log(`[Sync] 👥 Found ${cloudStudents?.length || 0} students for class ${cloudClass.name}`);
            
            if (cloudStudents) {
              for (const cloudStudent of cloudStudents) {
                try {
                  const localStudent = await studentsCollection.find(cloudStudent.id);
                  await localStudent.update((record: any) => {
                    record.name = cloudStudent.name;
                    record.rollNumber = cloudStudent.roll_number;
                    // updatedAt will be set automatically by WatermelonDB
                  });
                } catch {
                  await studentsCollection.create((record: any) => {
                    record._raw.id = cloudStudent.id;
                    record.classId = cloudClass.id;
                    record.name = cloudStudent.name;
                    record.rollNumber = cloudStudent.roll_number;
                    record.isDeleted = false;
                    // createdAt and updatedAt will be set automatically by WatermelonDB
                  });
                }
              }
            }
          }
          
          // ⚡ NEW: Fetch attendance records for this class
          const { data: cloudAttendance, error: attendanceError } = await supabase
            .from('attendance')
            .select('*')
            .eq('class_id', cloudClass.id);
          
          if (attendanceError) {
            console.error(`[Sync] ❌ Error fetching attendance for class ${cloudClass.name}:`, attendanceError);
          } else {
            console.log(`[Sync] 📊 Found ${cloudAttendance?.length || 0} attendance records for class ${cloudClass.name}`);
            
            if (cloudAttendance) {
              for (const cloudRecord of cloudAttendance) {
                try {
                  const localRecord = await attendanceCollection.find(cloudRecord.id);
                  await localRecord.update((record: any) => {
                    record.studentId = cloudRecord.student_id;
                    record.classId = cloudRecord.class_id;
                    record.date = cloudRecord.date;
                    record.status = cloudRecord.status;
                    record.notes = cloudRecord.notes;
                    // updatedAt will be set automatically by WatermelonDB
                  });
                } catch {
                  await attendanceCollection.create((record: any) => {
                    record._raw.id = cloudRecord.id;
                    record.studentId = cloudRecord.student_id;
                    record.classId = cloudRecord.class_id;
                    record.date = cloudRecord.date;
                    record.status = cloudRecord.status;
                    record.notes = cloudRecord.notes;
                    // createdAt and updatedAt will be set automatically by WatermelonDB
                  });
                }
              }
            }
          }
        }
      });
      
      console.log('[Sync] 🎉 Successfully fetched and synced all cloud data to local');
    } catch (error) {
      console.error('[Sync] ❌ Error fetching from Supabase:', error);
      throw error;
    }
  }

  destroy() {
    if (this.unsubscribeNetwork) {
      this.unsubscribeNetwork();
    }
  }
}

export const syncManager = SyncManager.getInstance();