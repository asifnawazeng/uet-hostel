import {
  collection,
  getDocs,
  limit,
  query,
  where,
  type Firestore,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';

export async function findLinkedStudentRecord(
  database: Firestore,
  uid: string,
  email?: string | null
): Promise<QueryDocumentSnapshot<DocumentData> | null> {
  const students = collection(database, 'students');
  const uidMatch = await getDocs(
    query(students, where('uid', '==', uid), limit(1))
  );

  if (!uidMatch.empty) {
    return uidMatch.docs[0] ?? null;
  }

  const normalizedEmail = email?.trim();
  if (!normalizedEmail) {
    return null;
  }

  const emailMatch = await getDocs(
    query(students, where('email', '==', normalizedEmail), limit(1))
  );

  return emailMatch.docs[0] ?? null;
}
