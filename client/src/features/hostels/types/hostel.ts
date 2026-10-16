import type { Timestamp } from 'firebase/firestore';

export type HostelGender = 'Male' | 'Female';
export type HostelStatus = 'active' | 'inactive';

export interface Hostel {
  id: string;
  name: string;
  gender: HostelGender;
  description?: string;
  totalRooms: number;
  status: HostelStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type HostelInput = Omit<Hostel, 'id' | 'createdAt' | 'updatedAt'>;