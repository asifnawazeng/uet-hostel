import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { auth, db } from '@/config/firebase';
import { apiRequest } from '@/services/api';
import { findLinkedStudentRecord } from '@/features/students/services/linkedStudentService';
import type {
  LeaveRequest,
  LeaveRequestInput,
  LeaveRequestUpdate,
} from '@/features/leave/types/leave';

const LEAVE_COLLECTION = 'leaveRequests';
const LIST_LIMIT = 500;

interface LeaveDecisionNotificationResponse {
  pushFailed: number;
}

export interface LeaveRequestUpdateResult {
  notificationWarning: string | null;
}

function getDatabase() {
  if (!db) {
    throw new Error(
      'Leave management is unavailable because Firebase is not configured.'
    );
  }

  return db;
}

/**
 * Get all leave requests for the currently logged-in student.
 */
export async function listMyLeaveRequests(): Promise<LeaveRequest[]> {
  if (!auth?.currentUser) {
    throw new Error('You must be logged in to view your leave requests.');
  }

  const database = getDatabase();

  const snapshot = await getDocs(
    query(
      collection(database, LEAVE_COLLECTION),
      where('studentId', '==', auth.currentUser.uid)
    )
  );

  return snapshot.docs
    .map(
      (leaveDocument) =>
        ({
          ...leaveDocument.data(),
          id: leaveDocument.id,
        }) as LeaveRequest
    )
    .sort(
      (first, second) =>
        second.createdAt.toMillis() - first.createdAt.toMillis()
    );
}

/**
 * Create a new leave request for the logged-in student.
 */
export async function createLeaveRequest(
  input: LeaveRequestInput
): Promise<string> {
  if (!auth?.currentUser) {
    throw new Error('You must be logged in to submit a leave request.');
  }

  const database = getDatabase();
  const user = auth.currentUser;

  if (!input.leaveType.trim()) {
    throw new Error('Please select a leave type.');
  }

  if (!input.fromDate) {
    throw new Error('Please select the starting date.');
  }

  if (!input.toDate) {
    throw new Error('Please select the ending date.');
  }

  if (input.toDate < input.fromDate) {
    throw new Error('The ending date cannot be before the starting date.');
  }

  if (!input.reason.trim()) {
    throw new Error('Please provide a reason for the leave.');
  }

  const studentRecord = await findLinkedStudentRecord(
    database,
    user.uid,
    user.email
  );

  if (!studentRecord) {
    throw new Error(
      'Your student record could not be found. Contact the hostel administrator.'
    );
  }

  const student = studentRecord.data();

  const leaveData = {
    studentId: user.uid,
    studentName:
      typeof student.name === 'string'
        ? student.name
        : user.displayName ?? 'Student',
    studentEmail: user.email ?? '',
    leaveType: input.leaveType.trim(),
    fromDate: input.fromDate,
    toDate: input.toDate,
    reason: input.reason.trim(),
    status: 'pending',
    adminRemarks: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const created = await addDoc(
    collection(database, LEAVE_COLLECTION),
    leaveData
  );

  return created.id;
}

/**
 * Get all leave requests.
 * This function is intended for administrators.
 */
export async function listAllLeaveRequests(): Promise<LeaveRequest[]> {
  const database = getDatabase();

  const snapshot = await getDocs(
    query(
      collection(database, LEAVE_COLLECTION),
      limit(LIST_LIMIT)
    )
  );

  return snapshot.docs
    .map(
      (leaveDocument) =>
        ({
          ...leaveDocument.data(),
          id: leaveDocument.id,
        }) as LeaveRequest
    )
    .sort(
      (first, second) =>
        second.createdAt.toMillis() - first.createdAt.toMillis()
    );
}

/**
 * Admin updates the status and remarks of a leave request.
 *
 * When a request is approved or rejected, a notification
 * is automatically created for the student.
 */
/**
 * Update a leave decision first, then ask the trusted backend to notify its
 * owner. Notification failures are returned separately because they cannot
 * undo the already-persisted leave status.
 */
export async function updateLeaveRequest(
  id: string,
  input: LeaveRequestUpdate
): Promise<LeaveRequestUpdateResult> {
  const database = getDatabase();

  const leaveRef = doc(database, LEAVE_COLLECTION, id);

  await updateDoc(leaveRef, {
    status: input.status,
    adminRemarks: input.adminRemarks?.trim() ?? '',
    updatedAt: serverTimestamp(),
  });

  if (input.status === 'pending') {
    return { notificationWarning: null };
  }

  try {
    const user = auth?.currentUser;
    if (!user) {
      throw new Error('Sign in again to send the leave decision notification.');
    }

    const idToken = await user.getIdToken();
    const result =
      await apiRequest<LeaveDecisionNotificationResponse>(
        '/notifications/events/leave-decision',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ id }),
        }
      );

    return {
      notificationWarning:
        result.pushFailed > 0
          ? `Leave status was updated, but push delivery failed for ${result.pushFailed} device(s). The student can still see the notification in the app.`
          : null,
    };
  } catch (notificationError: unknown) {
    const detail =
      notificationError instanceof Error
        ? notificationError.message
        : 'Unknown notification error.';

    return {
      notificationWarning: `Leave status was updated, but notification delivery could not be confirmed: ${detail}`,
    };
  }
}
