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
import type { Student, StudentInput, StudentUpdate } from '@/features/students/types/student';

const STUDENTS_COLLECTION = 'students';
const STUDENT_LIST_LIMIT = 500;

export async function listStudents(): Promise<Student[]> {
  const snapshot = await getDocs(query(collection(getDatabase(), STUDENTS_COLLECTION), limit(STUDENT_LIST_LIMIT)));
  return snapshot.docs
    .map((studentDocument) => normalizeStudent(studentDocument.id, studentDocument.data()))
    .sort((first, second) => second.createdAt.toMillis() - first.createdAt.toMillis());
}

export async function getStudent(id: string): Promise<Student | null> {
  const snapshot = await getDoc(doc(getDatabase(), STUDENTS_COLLECTION, id));
  return snapshot.exists() ? normalizeStudent(snapshot.id, snapshot.data()) : null;
}

export async function createStudent(input: StudentInput): Promise<string> {
  if (input.hostel.trim() || input.room.trim()) {
    throw new Error('Create the student record without a room assignment, then assign them from Hostel Management.');
  }
  await assertStudentIdAvailable(input.studentId);
  const linkedUid = await findStudentUidByEmail(input.email);
  const now = serverTimestamp();
  const studentData = {
    ...input,
    ...(linkedUid ? { uid: linkedUid } : {}),
    createdAt: now,
    updatedAt: now,
  };
  const created = await addDoc(collection(getDatabase(), STUDENTS_COLLECTION), studentData);
  return created.id;
}

export async function updateStudent(id: string, input: StudentUpdate): Promise<void> {
  const database = getDatabase();
  await runTransaction(database, async (transaction) => {
    const studentRef = doc(database, STUDENTS_COLLECTION, id);
    const studentSnapshot = await transaction.get(studentRef);
    if (!studentSnapshot.exists()) throw new Error('Student not found.');
    const existing = normalizeStudent(studentSnapshot.id, studentSnapshot.data());
    if (input.hostel !== existing.hostel || input.room !== existing.room) {
      throw new Error('Student room assignments must be changed from Hostel Management.');
    }
    if (existing.hostel || existing.room) {
      const hostels = await getDocs(query(collection(database, 'hostels'), where('name', '==', existing.hostel), limit(2)));
      if (hostels.size !== 1) throw new Error('The assigned hostel could not be verified. Contact an administrator.');
      const hostelSnapshot = await transaction.get(doc(database, 'hostels', hostels.docs[0].id));
      if (!hostelSnapshot.exists() || hostelSnapshot.data().gender !== input.gender) {
        throw new Error('A student’s gender cannot be changed to a value that conflicts with their assigned hostel.');
      }
    }
    await assertStudentIdAvailable(input.studentId, id);
    transaction.update(studentRef, { ...input, updatedAt: serverTimestamp() });
  });
}

export async function deleteStudent(id: string): Promise<void> {
  const database = getDatabase();
  await runTransaction(database, async (transaction) => {
    const studentRef = doc(database, STUDENTS_COLLECTION, id);
    const studentSnapshot = await transaction.get(studentRef);
    if (!studentSnapshot.exists()) throw new Error('Student not found.');
    const existing = normalizeStudent(studentSnapshot.id, studentSnapshot.data());
    if (existing.hostel || existing.room) {
      throw new Error('Remove this student from their room before deleting the student record.');
    }
    transaction.delete(studentRef);
  });
}

function getDatabase() {
  if (!db) throw new Error('Student records are not available because Firebase is not configured.');
  return db;
}

async function assertStudentIdAvailable(studentId: string, exceptId?: string) {
  const matchingRecords = await getDocs(
    query(
      collection(getDatabase(), STUDENTS_COLLECTION),
      where('studentId', '==', studentId),
      limit(2)
    )
  );

  if (matchingRecords.docs.some((record) => record.id !== exceptId)) {
    throw new Error('A student with this Student ID already exists.');
  }
}

async function findStudentUidByEmail(email: string): Promise<string | undefined> {
  const profiles = await getDocs(
    query(
      collection(getDatabase(), 'users'),
      where('email', '==', email.trim().toLowerCase()),
      limit(3)
    )
  );
  const matchingStudents = profiles.docs.filter((profile) => profile.data().role === 'student');
  return matchingStudents.length === 1 ? matchingStudents[0]?.id : undefined;
}

export function normalizeStudentAssignment(data: Record<string, unknown>): { hostel: string; room: string } {
  return {
    hostel: normalizeAssignmentValue(data.hostel),
    room: normalizeAssignmentValue(data.room),
  };
}

function normalizeStudent(id: string, data: Record<string, unknown>): Student {
  return {
    ...data,
    ...normalizeStudentAssignment(data),
    id,
  } as Student;
}

function normalizeAssignmentValue(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return ['n/a', 'na', 'none', 'null', 'undefined'].includes(trimmed.toLowerCase()) ? '' : trimmed;
}