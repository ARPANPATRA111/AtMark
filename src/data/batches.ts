import { Student } from '../storage/storage';

export interface Batch {
  id: string;
  name: string;
  count: number;
  students: Student[];
}

export const predefinedBatches: Batch[] = [
  {
    id: 'cs_batch_a',
    name: 'CS Batch A',
    count: 30,
    students: Array.from({ length: 30 }, (_, i) => ({
      name: `Student ${i + 1}`,
      rollNumber: `CSA${String(i + 1).padStart(3, '0')}`,
    })),
  },
  {
    id: 'cs_batch_b',
    name: 'CS Batch B',
    count: 28,
    students: Array.from({ length: 28 }, (_, i) => ({
      name: `Student ${i + 1}`,
      rollNumber: `CSB${String(i + 1).padStart(3, '0')}`,
    })),
  },
  {
    id: 'it_batch_a',
    name: 'IT Batch A',
    count: 25,
    students: Array.from({ length: 25 }, (_, i) => ({
      name: `Student ${i + 1}`,
      rollNumber: `ITA${String(i + 1).padStart(3, '0')}`,
    })),
  },
  {
    id: 'ece_batch_a',
    name: 'ECE Batch A',
    count: 32,
    students: Array.from({ length: 32 }, (_, i) => ({
      name: `Student ${i + 1}`,
      rollNumber: `ECE${String(i + 1).padStart(3, '0')}`,
    })),
  },
  {
    id: 'mech_batch_a',
    name: 'Mech Batch A',
    count: 35,
    students: Array.from({ length: 35 }, (_, i) => ({
      name: `Student ${i + 1}`,
      rollNumber: `MEC${String(i + 1).padStart(3, '0')}`,
    })),
  },
  {
    id: 'civil_batch_a',
    name: 'Civil Batch A',
    count: 30,
    students: Array.from({ length: 30 }, (_, i) => ({
      name: `Student ${i + 1}`,
      rollNumber: `CIV${String(i + 1).padStart(3, '0')}`,
    })),
  },
];
