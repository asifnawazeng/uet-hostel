import type { Timestamp } from 'firebase/firestore';

export type RoomStatus = 'available' | 'full' | 'inactive';

export interface Room {
  id: string;
  hostelId: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  occupied: number;
  status: RoomStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type RoomInput = Omit<Room, 'id' | 'occupied' | 'createdAt' | 'updatedAt'>;