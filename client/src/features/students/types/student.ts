import type { Timestamp } from 'firebase/firestore';

export type StudentStatus = 'active' | 'inactive';
export type StudentGender = 'Male' | 'Female';

export interface Student {
  id: string;
  uid?: string;
  name: string;
  email: string;
  studentId: string;
  department: string;
  semester: number;
  phone: string;
  gender: StudentGender;
  hostel: string;
  room: string;
  status: StudentStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type StudentInput = Omit<Student, 'id' | 'uid' | 'createdAt' | 'updatedAt'> & {
  uid?: string;
};

export type StudentUpdate = Omit<StudentInput, 'uid'>;