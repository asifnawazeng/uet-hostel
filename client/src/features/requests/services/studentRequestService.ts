import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth, db } from '@/config/firebase';
import { apiRequest } from '@/services/api';

export type StudentRequestType = 'complaint' | 'leave';
export type StudentRequestAction = 'withdraw' | 'cancel';

interface StudentRequestActionResponse {
  message: string;
  notificationWarning: string | null;
}

function getCurrentUser() {
  if (!auth?.currentUser) {
    throw new Error('You must be signed in to manage your requests.');
  }

  return auth.currentUser;
}

function getDatabase() {
  if (!db) {
    throw new Error('Request management is unavailable because Firebase is not configured.');
  }

  return db;
}

function archiveReferenceId(
  requestType: StudentRequestType,
  requestId: string
) {
  return `${requestType}__${requestId}`;
}

function archiveReferenceKey(
  requestType: StudentRequestType,
  requestId: string
) {
  return `${requestType}:${requestId}`;
}

export async function listMyArchivedRequests(): Promise<Set<string>> {
  const user = getCurrentUser();
  const database = getDatabase();
  const snapshot = await getDocs(
    collection(database, 'users', user.uid, 'archivedRequests')
  );

  return new Set(
    snapshot.docs.flatMap((archiveDocument) => {
      const requestType = archiveDocument.get('requestType');
      const requestId = archiveDocument.get('requestId');

      return (requestType === 'complaint' || requestType === 'leave') &&
        typeof requestId === 'string'
        ? [archiveReferenceKey(requestType, requestId)]
        : [];
    })
  );
}

export async function archiveMyRequest(
  requestType: StudentRequestType,
  requestId: string
): Promise<void> {
  const user = getCurrentUser();
  const database = getDatabase();

  await setDoc(
    doc(
      database,
      'users',
      user.uid,
      'archivedRequests',
      archiveReferenceId(requestType, requestId)
    ),
    {
      requestType,
      requestId,
      archivedAt: serverTimestamp(),
    }
  );
}

export async function restoreMyRequest(
  requestType: StudentRequestType,
  requestId: string
): Promise<void> {
  const user = getCurrentUser();
  const database = getDatabase();

  await deleteDoc(
    doc(
      database,
      'users',
      user.uid,
      'archivedRequests',
      archiveReferenceId(requestType, requestId)
    )
  );
}

export async function performStudentRequestAction(
  requestType: StudentRequestType,
  requestId: string,
  action: StudentRequestAction
): Promise<StudentRequestActionResponse> {
  const user = getCurrentUser();
  const idToken = await user.getIdToken();
  const collectionPath =
    requestType === 'complaint' ? 'complaints' : 'leave-requests';

  return apiRequest<StudentRequestActionResponse>(
    `/student-requests/${collectionPath}/${encodeURIComponent(requestId)}/${action}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    }
  );
}