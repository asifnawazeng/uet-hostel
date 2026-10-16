import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { auth, db } from '@/config/firebase';
import { getHostel } from '@/features/hostels/services/hostelService';
import type { Hostel } from '@/features/hostels/types/hostel';
import { listStudents, normalizeStudentAssignment } from '@/features/students/services/studentService';
import type { Student } from '@/features/students/types/student';
import type { Room, RoomInput, RoomStatus } from '@/features/rooms/types/room';
import { apiRequest } from '@/services/api';

const ROOMS = 'rooms';
const STUDENTS = 'students';
const LIST_LIMIT = 500;

export async function listRooms(hostelId: string): Promise<Room[]> {
  const snapshot = await getDocs(
    query(collection(getDatabase(), ROOMS), where('hostelId', '==', hostelId), limit(LIST_LIMIT))
  );
  const rooms = snapshot.docs
    .map((roomDocument) => ({ ...roomDocument.data(), id: roomDocument.id }) as Room)
    .sort((first, second) => first.roomNumber.localeCompare(second.roomNumber));
  const hostel = await getHostel(hostelId);
  if (!hostel) return rooms;

  const assignedStudents = await getDocs(
    query(collection(getDatabase(), STUDENTS), where('hostel', '==', hostel.name))
  );
  const occupancyByRoom = new Map<string, number>();
  assignedStudents.docs.forEach((studentDocument) => {
    const roomNumber = normalizeStudentAssignment(studentDocument.data()).room;
    if (roomNumber) occupancyByRoom.set(roomNumber, (occupancyByRoom.get(roomNumber) ?? 0) + 1);
  });

  return rooms.map((room) => {
    const occupied = occupancyByRoom.get(room.roomNumber) ?? 0;
    return { ...room, occupied, status: calculateRoomStatus(occupied, room.capacity, room.status) };
  });
}

export async function listAllRooms(): Promise<Room[]> {
  const snapshot = await getDocs(
    query(
      collection(getDatabase(), ROOMS),
      limit(LIST_LIMIT)
    )
  );

  const rooms = snapshot.docs.map(
    (roomDocument) =>
      ({
        ...roomDocument.data(),
        id: roomDocument.id,
      }) as Room
  );

  const hostelsSnapshot = await getDocs(
    collection(getDatabase(), 'hostels')
  );

  const hostelNames = new Map<string, string>();

  hostelsSnapshot.forEach((hostelDocument) => {
    const hostel = hostelDocument.data();

    if (typeof hostel.name === 'string') {
      hostelNames.set(hostelDocument.id, hostel.name);
    }
  });

  const studentsSnapshot = await getDocs(
    collection(getDatabase(), STUDENTS)
  );

  const occupancyByRoom = new Map<string, number>();

  studentsSnapshot.forEach((studentDocument) => {
    const student = normalizeStudentAssignment(
      studentDocument.data()
    );

    if (!student.hostel || !student.room) {
      return;
    }

    const key = `${student.hostel}::${student.room}`;

    occupancyByRoom.set(
      key,
      (occupancyByRoom.get(key) ?? 0) + 1
    );
  });

  return rooms
    .map((room) => {
      const hostelName = hostelNames.get(room.hostelId) ?? 'Unknown hostel';
      const key = `${hostelName}::${room.roomNumber}`;
      const occupied = occupancyByRoom.get(key) ?? 0;

      return {
        ...room,
        occupied,
        status: calculateRoomStatus(
          occupied,
          room.capacity,
          room.status
        ),
      };
    })
    .sort((first, second) => {
      const hostelComparison = (
        hostelNames.get(first.hostelId) ?? ''
      ).localeCompare(
        hostelNames.get(second.hostelId) ?? ''
      );

      return hostelComparison !== 0
        ? hostelComparison
        : first.roomNumber.localeCompare(second.roomNumber);
    });
}

export async function getRoom(id: string): Promise<Room | null> {
  const snapshot = await getDoc(doc(getDatabase(), ROOMS, id));
  return snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as Room) : null;
}

export async function getRoomStudents(hostel: Hostel, roomNumber: string): Promise<Student[]> {
  const snapshot = await getDocs(
    query(collection(getDatabase(), STUDENTS), where('hostel', '==', hostel.name))
  );
  return snapshot.docs
    .filter((studentDocument) => normalizeStudentAssignment(studentDocument.data()).room === roomNumber)
    .map((studentDocument) => ({
      ...studentDocument.data(),
      ...normalizeStudentAssignment(studentDocument.data()),
      id: studentDocument.id,
    }) as Student)
    .sort((first, second) => first.studentId.localeCompare(second.studentId));
}

export async function getAssignableStudents(): Promise<Student[]> {
  const students = await listStudents();
  return students
    .filter((student) => !student.hostel && !student.room)
    .sort((first, second) => first.name.localeCompare(second.name));
}

export async function createRoom(input: RoomInput): Promise<string> {
  const database = getDatabase();
  const hostelRef = doc(database, 'hostels', input.hostelId);
  const roomRef = doc(collection(database, ROOMS));
  await runTransaction(database, async (transaction) => {
    const hostelSnapshot = await transaction.get(hostelRef);
    if (!hostelSnapshot.exists()) throw new Error('Hostel not found.');
    const existingRooms = await getDocs(query(collection(database, ROOMS), where('hostelId', '==', input.hostelId)));
    if (existingRooms.size >= hostelSnapshot.data().totalRooms) {
      throw new Error('This hostel has reached its total room count. Increase the hostel room count first.');
    }
    if (existingRooms.docs.some((room) => room.data().roomNumber === input.roomNumber.trim())) {
      throw new Error('A room with this number already exists in this hostel.');
    }
    transaction.set(roomRef, {
      ...input,
      roomNumber: input.roomNumber.trim(),
      occupied: 0,
      status: input.status === 'inactive' ? 'inactive' : 'available',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.update(hostelRef, { updatedAt: serverTimestamp() });
  });
  return roomRef.id;
}

export async function updateRoom(id: string, input: RoomInput): Promise<void> {
  const database = getDatabase();
  const room = await getRoom(id);
  if (!room) throw new Error('Room not found.');
  if (input.hostelId !== room.hostelId) throw new Error('A room cannot be moved between hostels by editing. Use student assignment to move occupants.');
  const normalizedNumber = input.roomNumber.trim();

  await runTransaction(database, async (transaction) => {
    const roomRef = doc(database, ROOMS, id);
    const hostelRef = doc(database, 'hostels', room.hostelId);
    const [roomSnapshot, hostelSnapshot] = await Promise.all([
      transaction.get(roomRef),
      transaction.get(hostelRef),
    ]);
    if (!roomSnapshot.exists()) throw new Error('Room not found.');
    if (!hostelSnapshot.exists()) throw new Error('Hostel not found.');
    const currentRoom = { ...roomSnapshot.data(), id: roomSnapshot.id } as Room;
    if (currentRoom.hostelId !== input.hostelId) throw new Error('The room’s hostel changed. Refresh and try again.');
    const hostel = { ...hostelSnapshot.data(), id: hostelSnapshot.id } as Hostel;
    const existingRooms = await getDocs(query(collection(database, ROOMS), where('hostelId', '==', input.hostelId)));
    if (existingRooms.docs.some((record) => record.id !== id && record.data().roomNumber === normalizedNumber)) {
      throw new Error('A room with this number already exists in this hostel.');
    }
    const assignedStudents = await getRoomStudents(hostel, currentRoom.roomNumber);
    if (input.capacity < assignedStudents.length) throw new Error(`Capacity cannot be less than the ${assignedStudents.length} assigned students.`);
    if (assignedStudents.length > 499) throw new Error('This room has too many students to safely update. Contact support.');
    const studentSnapshots = await Promise.all(assignedStudents.map((student) => transaction.get(doc(database, STUDENTS, student.id))));
    const status = calculateRoomStatus(assignedStudents.length, input.capacity, input.status);

    transaction.update(roomRef, {
      ...input,
      roomNumber: normalizedNumber,
      occupied: assignedStudents.length,
      status,
      updatedAt: serverTimestamp(),
    });
    transaction.update(hostelRef, { updatedAt: serverTimestamp() });
    studentSnapshots.forEach((studentSnapshot) => {
      if (studentSnapshot.exists() && currentRoom.roomNumber !== normalizedNumber) {
        transaction.update(studentSnapshot.ref, { room: normalizedNumber, updatedAt: serverTimestamp() });
      }
    });
  });
}




export async function deleteRoom(id: string): Promise<void> {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured.');
  }

  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Please log in before deleting a room.');
  }

  const token = await currentUser.getIdToken();

  await apiRequest(`/rooms/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
export async function assignStudent(studentId: string, hostelId: string, roomId: string): Promise<void> {
  await requestAssignment('/room-assignments/assign', { studentId, hostelId, roomId });
}

export async function moveStudent(studentId: string, hostelId: string, roomId: string): Promise<void> {
  await requestAssignment('/room-assignments/move', { studentId, hostelId, roomId });
}

export async function removeStudentFromRoom(studentId: string): Promise<void> {
  await requestAssignment('/room-assignments/remove', { studentId });
}

export function calculateRoomStatus(occupied: number, capacity: number, requested: RoomStatus): RoomStatus {
  if (requested === 'inactive') return 'inactive';
  return occupied >= capacity ? 'full' : 'available';
}

async function requestAssignment(path: string, payload: Record<string, string>): Promise<void> {
  if (!auth?.currentUser) throw new Error('Sign in with an administrator account to manage room assignments.');
  const token = await auth.currentUser.getIdToken();
  await apiRequest(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

function getDatabase() {
  if (!db) throw new Error('Room management is unavailable because Firebase is not configured.');
  return db;
}