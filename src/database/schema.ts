import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 2, // Bumped for optimizations
  tables: [
    tableSchema({
      name: 'classes',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'is_deleted', type: 'boolean', isIndexed: true }, // Soft delete
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'students',
      columns: [
        { name: 'class_id', type: 'string', isIndexed: true },
        { name: 'roll_number', type: 'string', isIndexed: true }, // Added index
        { name: 'name', type: 'string' },
        { name: 'is_deleted', type: 'boolean', isIndexed: true }, // Soft delete
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'attendance',
      columns: [
        { name: 'student_id', type: 'string', isIndexed: true },
        { name: 'class_id', type: 'string', isIndexed: true },
        { name: 'date', type: 'string', isIndexed: true },
        { name: 'status', type: 'string' }, // Only 'present' or 'late' - NO 'absent'!
        { name: 'notes', type: 'string', isOptional: true }, // For late arrivals
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'synced_at', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'sync_metadata',
      columns: [
        { name: 'key', type: 'string' },
        { name: 'value', type: 'string' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
