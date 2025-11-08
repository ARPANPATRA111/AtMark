import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export class Class extends Model {
  static table = 'classes';
  static associations = {
    students: { type: 'has_many' as const, foreignKey: 'class_id' },
    attendance: { type: 'has_many' as const, foreignKey: 'class_id' },
  };

  @field('name') name!: string;
  @field('user_id') userId!: string;
  @field('is_deleted') isDeleted!: boolean;
  @date('deleted_at') deletedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt?: Date;
}

export class Student extends Model {
  static table = 'students';
  static associations = {
    class: { type: 'belongs_to' as const, key: 'class_id' },
    attendance: { type: 'has_many' as const, foreignKey: 'student_id' },
  };

  @field('class_id') classId!: string;
  @field('roll_number') rollNumber!: string;
  @field('name') name!: string;
  @field('is_deleted') isDeleted!: boolean;
  @date('deleted_at') deletedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt?: Date;

  @relation('classes', 'class_id') class: any;
}

export class Attendance extends Model {
  static table = 'attendance';
  static associations = {
    student: { type: 'belongs_to' as const, key: 'student_id' },
    class: { type: 'belongs_to' as const, key: 'class_id' },
  };

  @field('student_id') studentId!: string;
  @field('class_id') classId!: string;
  @field('date') date!: string;
  @field('status') status!: 'present' | 'late'; // No 'absent' - absence is implicit!
  @field('notes') notes?: string; // For late arrivals or special notes
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('synced_at') syncedAt?: Date;

  @relation('students', 'student_id') student: any;
  @relation('classes', 'class_id') class: any;
}

export class SyncMetadata extends Model {
  static table = 'sync_metadata';

  @field('key') key!: string;
  @field('value') value!: string;
  @date('updated_at') updatedAt!: Date;
}
