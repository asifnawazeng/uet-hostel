import { FieldValue, type DocumentReference, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';

import { adminDb } from '@server/config/firebase';

type RoomStatus = 'available' | 'full' | 'inactive';

interface StudentRecord {
  hostel?: unknown;
  room?: unknown;
  gender?: unknown;
}

interface HostelRecord {
  name?: unknown;
  gender?: unknown;
  status?: unknown;
}

interface RoomRecord {
  hostelId?: unknown;
  roomNumber?: unknown;
  capacity?: unknown;
  occupied?: unknown;
  status?: unknown;
}

export class RoomAssignmentError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message);
    this.name = 'RoomAssignmentError';
  }
}

export async function assignStudentToRoom(studentId: string, hostelId: string, roomId: string): Promise<void> {
  const database = getDatabase();
  await database.runTransaction(async (transaction) => {
    const studentRef = database.collection('students').doc(studentId);
    const hostelRef = database.collection('hostels').doc(hostelId);
    const roomRef = database.collection('rooms').doc(roomId);
    const [studentSnapshot, hostelSnapshot, roomSnapshot] = await Promise.all([
      transaction.get(studentRef),
      transaction.get(hostelRef),
      transaction.get(roomRef),
    ]);
    requireExists(studentSnapshot, 'Student not found.');
    requireExists(hostelSnapshot, 'Hostel not found.');
    requireExists(roomSnapshot, 'Room not found.');

    const student = studentSnapshot.data() as StudentRecord;
    const hostel = hostelSnapshot.data() as HostelRecord;
    const room = roomSnapshot.data() as RoomRecord;
    const assignment = normalizeAssignment(student);
    if (assignment.hostel || assignment.room) throw new RoomAssignmentError('Student is already assigned to a room. Move the student instead.');
    if (Boolean(assignment.hostel) !== Boolean(assignment.room)) throw new RoomAssignmentError('The student has an incomplete room assignment. Correct it before assigning again.');
    validateDestination(student, hostel, room, hostelId);

    const roomOccupants = await getRoomOccupants(database, transaction, String(hostel.name), String(room.roomNumber));
    if (roomOccupants >= Number(room.capacity)) throw new RoomAssignmentError('This room is full. Select another room.');
    const nextOccupied = roomOccupants + 1;
    transaction.update(roomRef, {
      occupied: nextOccupied,
      status: getRoomStatus(nextOccupied, Number(room.capacity), room.status as RoomStatus),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(studentRef, {
      hostel: hostel.name,
      room: room.roomNumber,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function moveStudentToRoom(studentId: string, hostelId: string, roomId: string): Promise<void> {
  const database = getDatabase();
  const studentRef = database.collection('students').doc(studentId);
  const initialStudent = await studentRef.get();
  if (!initialStudent.exists) throw new RoomAssignmentError('Student not found.', 404);
  const initialAssignment = normalizeAssignment(initialStudent.data() as StudentRecord);
  if (!initialAssignment.hostel || !initialAssignment.room) {
    throw new RoomAssignmentError('Student is not assigned to a room. Assign them first.');
  }
  const { hostelRef: oldHostelRef, roomRef: oldRoomRef } = await findRoomReferences(database, initialAssignment);
  const newHostelRef = database.collection('hostels').doc(hostelId);
  const newRoomRef = database.collection('rooms').doc(roomId);

  await database.runTransaction(async (transaction) => {
    const [studentSnapshot, oldHostelSnapshot, oldRoomSnapshot, newHostelSnapshot, newRoomSnapshot] = await Promise.all([
      transaction.get(studentRef),
      transaction.get(oldHostelRef),
      transaction.get(oldRoomRef),
      transaction.get(newHostelRef),
      transaction.get(newRoomRef),
    ]);
    requireExists(studentSnapshot, 'Student not found.');
    requireExists(oldHostelSnapshot, 'The current hostel could not be found.');
    requireExists(oldRoomSnapshot, 'The current room could not be found.');
    requireExists(newHostelSnapshot, 'Hostel not found.');
    requireExists(newRoomSnapshot, 'Room not found.');
    if (oldRoomRef.path === newRoomRef.path) throw new RoomAssignmentError('The student is already assigned to this room.');

    const student = studentSnapshot.data() as StudentRecord;
    const oldHostel = oldHostelSnapshot.data() as HostelRecord;
    const oldRoom = oldRoomSnapshot.data() as RoomRecord;
    const newHostel = newHostelSnapshot.data() as HostelRecord;
    const newRoom = newRoomSnapshot.data() as RoomRecord;
    const currentAssignment = normalizeAssignment(student);
    if (currentAssignment.hostel !== initialAssignment.hostel || currentAssignment.room !== initialAssignment.room) {
      throw new RoomAssignmentError('The student assignment changed. Refresh and try again.');
    }
    validateDestination(student, newHostel, newRoom, hostelId);

    const [oldOccupants, newOccupants] = await Promise.all([
      getRoomOccupants(database, transaction, String(oldHostel.name), String(oldRoom.roomNumber)),
      getRoomOccupants(database, transaction, String(newHostel.name), String(newRoom.roomNumber)),
    ]);
    if (oldOccupants < 1) throw new RoomAssignmentError('The current room occupancy is invalid. Contact an administrator.', 409);
    if (newOccupants >= Number(newRoom.capacity)) throw new RoomAssignmentError('This room is full. Select another room.');

    const oldNext = oldOccupants - 1;
    const newNext = newOccupants + 1;
    transaction.update(oldRoomRef, {
      occupied: oldNext,
      status: getRoomStatus(oldNext, Number(oldRoom.capacity), oldRoom.status as RoomStatus),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(newRoomRef, {
      occupied: newNext,
      status: getRoomStatus(newNext, Number(newRoom.capacity), newRoom.status as RoomStatus),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(studentRef, {
      hostel: newHostel.name,
      room: newRoom.roomNumber,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function removeStudentFromRoom(studentId: string): Promise<void> {
  const database = getDatabase();
  const studentRef = database.collection('students').doc(studentId);
  const initialStudent = await studentRef.get();
  if (!initialStudent.exists) throw new RoomAssignmentError('Student not found.', 404);
  const initialAssignment = normalizeAssignment(initialStudent.data() as StudentRecord);
  if (!initialAssignment.hostel || !initialAssignment.room) throw new RoomAssignmentError('Student is not assigned to a room.');
  const { hostelRef, roomRef } = await findRoomReferences(database, initialAssignment);

  await database.runTransaction(async (transaction) => {
    const [studentSnapshot, hostelSnapshot, roomSnapshot] = await Promise.all([
      transaction.get(studentRef),
      transaction.get(hostelRef),
      transaction.get(roomRef),
    ]);
    requireExists(studentSnapshot, 'Student not found.');
    requireExists(hostelSnapshot, 'Hostel not found.');
    requireExists(roomSnapshot, 'Room not found.');
    const student = studentSnapshot.data() as StudentRecord;
    const hostel = hostelSnapshot.data() as HostelRecord;
    const room = roomSnapshot.data() as RoomRecord;
    const currentAssignment = normalizeAssignment(student);
    if (currentAssignment.hostel !== initialAssignment.hostel || currentAssignment.room !== initialAssignment.room) {
      throw new RoomAssignmentError('The student assignment changed. Refresh and try again.');
    }

    const occupied = await getRoomOccupants(database, transaction, String(hostel.name), String(room.roomNumber));
    if (occupied < 1) throw new RoomAssignmentError('The room occupancy is invalid. Contact an administrator.', 409);
    const nextOccupied = occupied - 1;
    transaction.update(roomRef, {
      occupied: nextOccupied,
      status: getRoomStatus(nextOccupied, Number(room.capacity), room.status as RoomStatus),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(studentRef, {
      hostel: '',
      room: '',
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function findRoomReferences(
  database: Firestore,
  assignment: { hostel: string; room: string }
): Promise<{ hostelRef: DocumentReference; roomRef: DocumentReference }> {
  const hostels = await database.collection('hostels').where('name', '==', assignment.hostel).limit(2).get();
  if (hostels.size !== 1) throw new RoomAssignmentError('The current hostel could not be uniquely identified.', 409);
  const hostelRef = hostels.docs[0].ref;
  const rooms = await database.collection('rooms')
    .where('hostelId', '==', hostelRef.id)
    .limit(500)
    .get();
  const matchingRooms = rooms.docs.filter((room) => room.data().roomNumber === assignment.room);
  if (matchingRooms.length !== 1) throw new RoomAssignmentError('The current room could not be uniquely identified.', 409);
  return { hostelRef, roomRef: matchingRooms[0].ref };
}

async function getRoomOccupants(database: Firestore, transaction: FirebaseFirestore.Transaction, hostelName: string, roomNumber: string): Promise<number> {
  const matchingRoomStudents = await transaction.get(
    database.collection('students').where('room', '==', roomNumber)
  );
  return matchingRoomStudents.docs.filter((student) => {
    const assignment = normalizeAssignment(student.data() as StudentRecord);
    return assignment.hostel === hostelName && assignment.room === roomNumber;
  }).length;
}

function validateDestination(student: StudentRecord, hostel: HostelRecord, room: RoomRecord, hostelId: string): void {
  if (room.hostelId !== hostelId) throw new RoomAssignmentError('The selected room does not belong to this hostel.');
  if (hostel.status !== 'active') throw new RoomAssignmentError('Students cannot be assigned to an inactive hostel.');
  if (room.status === 'inactive') throw new RoomAssignmentError('Students cannot be assigned to an inactive room.');
  if (student.gender !== hostel.gender) throw new RoomAssignmentError('The student gender does not match the selected hostel.');
  if (!Number.isInteger(room.capacity) || Number(room.capacity) < 1) throw new RoomAssignmentError('The selected room has invalid capacity.', 409);
}

function normalizeAssignment(student: StudentRecord): { hostel: string; room: string } {
  return { hostel: normalizeValue(student.hostel), room: normalizeValue(student.room) };
}

function normalizeValue(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return ['n/a', 'na', 'none', 'null', 'undefined'].includes(trimmed.toLowerCase()) ? '' : trimmed;
}

function getRoomStatus(occupied: number, capacity: number, currentStatus: unknown): RoomStatus {
  if (currentStatus === 'inactive') return 'inactive';
  return occupied >= capacity ? 'full' : 'available';
}

function requireExists(snapshot: DocumentSnapshot, message: string): asserts snapshot is DocumentSnapshot & { exists: true } {
  if (!snapshot.exists) throw new RoomAssignmentError(message, 404);
}


export async function deleteRoomSafely(roomId: string): Promise<void> {
  const database = getDatabase();
  const roomRef = database.collection('rooms').doc(roomId);

  await database.runTransaction(async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);

    requireExists(roomSnapshot, 'Room not found.');

    const room = roomSnapshot.data() as RoomRecord;
    const hostelId = normalizeValue(room.hostelId);
    const roomNumber = normalizeValue(room.roomNumber);

    if (!hostelId || !roomNumber) {
      throw new RoomAssignmentError(
        'The room has invalid hostel or room details.',
        409
      );
    }

    const hostelRef = database.collection('hostels').doc(hostelId);
    const hostelSnapshot = await transaction.get(hostelRef);

    requireExists(hostelSnapshot, 'Hostel not found.');

    const hostel = hostelSnapshot.data() as HostelRecord;
    const hostelName = normalizeValue(hostel.name);

    if (!hostelName) {
      throw new RoomAssignmentError(
        'The hostel has an invalid name.',
        409
      );
    }

    const matchingStudents = await transaction.get(
      database.collection('students').where('room', '==', roomNumber)
    );

    const hasAssignedStudents = matchingStudents.docs.some((student) => {
      const assignment = normalizeAssignment(
        student.data() as StudentRecord
      );

      return (
        assignment.hostel === hostelName &&
        assignment.room === roomNumber
      );
    });

    if (hasAssignedStudents) {
      throw new RoomAssignmentError(
        'This room cannot be deleted because students are currently assigned to it.',
        409
      );
    }

    transaction.delete(roomRef);
    transaction.update(hostelRef, {
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

function getDatabase(): Firestore {
  if (!adminDb) throw new RoomAssignmentError('Firebase Admin is not configured.', 503);
  return adminDb;
}