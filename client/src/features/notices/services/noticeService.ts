import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import {
  notifyNoticeCreated,
  runPostWriteNotification,
} from '@/features/notifications/services/NotificationService';

import type {
  Notice,
  NoticeInput,
} from '@/features/notices/types/notice';

const NOTICES_COLLECTION = 'notices';
const NOTICE_LIST_LIMIT = 500;

export interface NoticeWriteResult {
  id: string;
  notificationWarning: string | null;
}

export async function createNotice(
  createdBy: string,
  input: NoticeInput
): Promise<NoticeWriteResult> {
  const database = getDatabase();

  const title = input.title.trim();
  const content = input.content.trim();

  const noticeData = {
    title,
    content,
    priority: input.priority,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const created = await addDoc(
    collection(database, NOTICES_COLLECTION),
    noticeData
  );

  const notificationWarning = await runPostWriteNotification(
    'notice',
    () => notifyNoticeCreated(created.id)
  );

  return { id: created.id, notificationWarning };
}

export async function listNotices(): Promise<Notice[]> {
  const database = getDatabase();

  const snapshot = await getDocs(
    query(
      collection(database, NOTICES_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(NOTICE_LIST_LIMIT)
    )
  );

  return snapshot.docs.map((noticeDocument) => ({
    ...noticeDocument.data(),
    id: noticeDocument.id,
  })) as Notice[];
}

export async function updateNotice(
  id: string,
  input: NoticeInput
): Promise<void> {
  const database = getDatabase();

  await updateDoc(
    doc(database, NOTICES_COLLECTION, id),
    {
      title: input.title.trim(),
      content: input.content.trim(),
      priority: input.priority,
      updatedAt: serverTimestamp(),
    }
  );
}

export async function deleteNotice(id: string): Promise<void> {
  const database = getDatabase();

  await deleteDoc(
    doc(database, NOTICES_COLLECTION, id)
  );
}

function getDatabase() {
  if (!db) {
    throw new Error(
      'Notices are not available because Firebase is not configured.'
    );
  }

  return db;
}