import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';
import { setGenerator } from '@nozbe/watermelondb/utils/common/randomId';
import { schema } from './schema';
import { Class, Student, Attendance, SyncMetadata } from './models';

// Configure WatermelonDB to generate proper UUIDs compatible with Supabase
setGenerator(() => {
  // Generate RFC4122 version 4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
});

const adapter = new SQLiteAdapter({
  schema,
  migrations: schemaMigrations({
    migrations: [
      {
        // Migration from v1 to v2: Add soft delete and optimization fields
        toVersion: 2,
        steps: [
          // Add soft delete to classes
          addColumns({
            table: 'classes',
            columns: [
              { name: 'is_deleted', type: 'boolean', isIndexed: true },
              { name: 'deleted_at', type: 'number', isOptional: true },
            ],
          }),
          // Add soft delete to students and index roll_number
          addColumns({
            table: 'students',
            columns: [
              { name: 'is_deleted', type: 'boolean', isIndexed: true },
              { name: 'deleted_at', type: 'number', isOptional: true },
            ],
          }),
          // Add notes field to attendance
          addColumns({
            table: 'attendance',
            columns: [
              { name: 'notes', type: 'string', isOptional: true },
            ],
          }),
        ],
      },
    ],
  }),
  jsi: true, // Use JSI for better performance (React Native 0.68+)
  onSetUpError: error => {
    console.error('[Database] Setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Class, Student, Attendance, SyncMetadata],
});
