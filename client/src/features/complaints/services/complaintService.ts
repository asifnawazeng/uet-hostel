import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import {
  notifyComplaintCreated,
  notifyComplaintUpdated,
  runPostWriteNotification,
} from '@/features/notifications/services/NotificationService';

import type {
  Complaint,
  ComplaintInput,
  ComplaintStatus,
} from '@/features/complaints/types/complaint';

const COMPLAINTS_COLLECTION = 'complaints';

export interface ComplaintWriteResult {
  id?: string;
  notificationWarning: string | null;
}

export async function createComplaint(
  studentId: string,
  studentName: string,
  input: ComplaintInput
): Promise<ComplaintWriteResult> {
  const database = getDatabase();

  const complaintData = {
    studentId,
    studentName,
    subject: input.subject.trim(),
    description: input.description.trim(),
    category: input.category,
    priority: input.priority,
    status: 'pending' as ComplaintStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const created = await addDoc(
    collection(database, COMPLAINTS_COLLECTION),
    complaintData
  );

  const notificationWarning = await runPostWriteNotification(
    'complaint',
    () => notifyComplaintCreated(created.id)
  );

  return { id: created.id, notificationWarning };
}

export async function listComplaints(): Promise<Complaint[]> {
  const database = getDatabase();

  const snapshot = await getDocs(
    query(
      collection(database, COMPLAINTS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(500)
    )
  );

  return snapshot.docs.map((complaintDocument) => ({
    ...complaintDocument.data(),
    id: complaintDocument.id,
  })) as Complaint[];
}

export async function listStudentComplaints(
  studentId: string
): Promise<Complaint[]> {
  const database = getDatabase();

  const snapshot = await getDocs(
    query(
      collection(database, COMPLAINTS_COLLECTION),
      where('studentId', '==', studentId)
    )
  );

  return snapshot.docs
    .map(
      (complaintDocument): Complaint => ({
        ...complaintDocument.data(),
        id: complaintDocument.id,
      }) as Complaint
    )
    .sort(
      (first, second) =>
        second.createdAt.toMillis() - first.createdAt.toMillis()
    );
}

export async function getComplaint(
  id: string
): Promise<Complaint | null> {
  const database = getDatabase();

  const snapshot = await getDoc(
    doc(database, COMPLAINTS_COLLECTION, id)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    ...snapshot.data(),
    id: snapshot.id,
  } as Complaint;
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  adminResponse?: string
): Promise<ComplaintWriteResult> {
  const database = getDatabase();

  const complaintRef = doc(
    database,
    COMPLAINTS_COLLECTION,
    id
  );

  const complaintSnapshot = await getDoc(complaintRef);

  if (!complaintSnapshot.exists()) {
    throw new Error('Complaint not found.');
  }

  const trimmedResponse = adminResponse?.trim();

  await updateDoc(complaintRef, {
    status,
    ...(adminResponse !== undefined
      ? { adminResponse: trimmedResponse }
      : {}),
    updatedAt: serverTimestamp(),
  });

  const notificationWarning = await runPostWriteNotification(
    'complaint status update',
    () => notifyComplaintUpdated(id)
  );

  return { notificationWarning };
}

function getDatabase() {
  if (!db) {
    throw new Error(
      'Complaints are not available because Firebase is not configured.'
    );
  }

  return db;
}