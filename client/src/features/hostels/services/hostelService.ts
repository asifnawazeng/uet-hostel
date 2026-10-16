import {
  addDoc,
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
import { db } from '@/config/firebase';
import type { Hostel, HostelInput } from '@/features/hostels/types/hostel';
import type { Room } from '@/features/rooms/types/room';

const HOSTELS = 'hostels';
const ROOMS = 'rooms';
const STUDENTS = 'students';
const LIST_LIMIT = 500;

export async function listHostels(): Promise<Hostel[]> {
  const snapshot = await getDocs(query(collection(getDatabase(), HOSTELS), limit(LIST_LIMIT)));
  return snapshot.docs
    .map((hostelDocument) => ({ ...hostelDocument.data(), id: hostelDocument.id }) as Hostel)
    .sort((first, second) => first.name.localeCompare(second.name));
}

export async function getHostel(id: string): Promise<Hostel | null> {
  const snapshot = await getDoc(doc(getDatabase(), HOSTELS, id));
  return snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as Hostel) : null;
}

export async function listHostelRooms(hostelId: string): Promise<Room[]> {
  const snapshot = await getDocs(
    query(collection(getDatabase(), ROOMS), where('hostelId', '==', hostelId))
  );
  return snapshot.docs
    .map((roomDocument) => ({ ...roomDocument.data(), id: roomDocument.id }) as Room)
    .sort((first, second) => first.roomNumber.localeCompare(second.roomNumber));
}

export async function createHostel(input: HostelInput): Promise<string> {
  await assertHostelNameAvailable(input.name);
  const now = serverTimestamp();
  const created = await addDoc(collection(getDatabase(), HOSTELS), {
    ...input,
    name: input.name.trim(),
    description: (input.description ?? '').trim(),
    createdAt: now,
    updatedAt: now,
  });
  return created.id;
}

export async function updateHostel(id: string, input: HostelInput): Promise<void> {
  const database = getDatabase();
  await assertHostelNameAvailable(input.name, id);
  const normalizedName = input.name.trim();
  await runTransaction(database, async (transaction) => {
    const hostelRef = doc(database, HOSTELS, id);
    const currentSnapshot = await transaction.get(hostelRef);
    if (!currentSnapshot.exists()) throw new Error('Hostel not found.');
    const currentName = currentSnapshot.data().name as string;
    const rooms = await getDocs(query(collection(database, ROOMS), where('hostelId', '==', id)));
    if (input.totalRooms < rooms.size) {
      throw new Error(`Total rooms cannot be less than the ${rooms.size} rooms already created.`);
    }

    const currentGender = currentSnapshot.data().gender as Hostel['gender'];
    const needsAssignmentCheck = currentName !== normalizedName || currentGender !== input.gender;
    const studentMatches = needsAssignmentCheck
      ? await getDocs(query(collection(database, STUDENTS), where('hostel', '==', currentName), limit(LIST_LIMIT)))
      : null;
    if (studentMatches?.size === LIST_LIMIT) {
      throw new Error('This hostel has too many assigned student records to safely rename. Contact support.');
    }
    const studentRecords = studentMatches?.docs.filter((student) => Boolean(student.data().room)) ?? [];
    if (currentName !== normalizedName && studentRecords.length > 0) {
      throw new Error('This hostel cannot be renamed while students are assigned to it. Remove or move assigned students first.');
    }
    const studentSnapshots = await Promise.all(studentRecords.map((student) => transaction.get(student.ref)));
    if (currentGender !== input.gender && studentSnapshots.some((student) => student.exists() && student.data().gender !== input.gender)) {
      throw new Error('Hostel gender cannot change while assigned students have a different gender.');
    }
    transaction.update(hostelRef, {
      ...input,
      name: normalizedName,
      description: (input.description ?? '').trim(),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function deleteHostel(id: string): Promise<void> {
  const database = getDatabase();
  await runTransaction(database, async (transaction) => {
    const hostelRef = doc(database, HOSTELS, id);
    const hostelSnapshot = await transaction.get(hostelRef);
    if (!hostelSnapshot.exists()) throw new Error('Hostel not found.');
    const rooms = await getDocs(query(collection(database, ROOMS), where('hostelId', '==', id), limit(1)));
    if (!rooms.empty) throw new Error('Cannot delete this hostel because it contains rooms. Remove or reassign its rooms first.');
    const students = await getDocs(query(collection(database, STUDENTS), where('hostel', '==', hostelSnapshot.data().name), limit(1)));
    if (!students.empty) throw new Error('Cannot delete this hostel because students are assigned to it.');
    transaction.delete(hostelRef);
  });
}

async function assertHostelNameAvailable(name: string, exceptId?: string): Promise<void> {
  const matches = await getDocs(
    query(collection(getDatabase(), HOSTELS), where('name', '==', name.trim()), limit(2))
  );
  if (matches.docs.some((hostel) => hostel.id !== exceptId)) {
    throw new Error('A hostel with this name already exists.');
  }
}

function getDatabase() {
  if (!db) throw new Error('Hostel management is unavailable because Firebase is not configured.');
  return db;
}