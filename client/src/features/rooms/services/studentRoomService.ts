import { auth } from '@/config/firebase';
import { apiRequest } from '@/services/api';

export interface StudentRoomResponse {
  student: {
    hostel: string;
    room: string;
  } | null;
  room: {
    id: string;
    roomNumber: string;
    floor: number;
    capacity: number;
    occupied: number;
    status: 'available' | 'full' | 'inactive';
  } | null;
}

export async function getMyRoomInformation(): Promise<StudentRoomResponse> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('You must be logged in to view your room.');
  }

  const idToken = await user.getIdToken();
  return apiRequest<StudentRoomResponse>('/student/room', {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
}
