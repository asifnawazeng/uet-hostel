import type { Timestamp } from 'firebase/firestore';

export interface UserProfileData {
  id?: string;
  uid: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  phone?: string;
  studentId?: string;
  department?: string;
  semester?: number;
  gender?: 'Male' | 'Female';
  hostel?: string;
  room?: string;
  status?: 'active' | 'inactive';
  photoURL?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ProfileUpdateInput {
  name: string;
  phone: string;
}

export type StudentProfile = UserProfileData;
export type StudentProfileUpdate = ProfileUpdateInput;

