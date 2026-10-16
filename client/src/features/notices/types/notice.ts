import type { Timestamp } from 'firebase/firestore';

export type NoticePriority = 'normal' | 'important' | 'urgent';

export interface Notice {
  id: string;
  title: string;
  content: string;
  priority: NoticePriority;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type NoticeInput = {
  title: string;
  content: string;
  priority: NoticePriority;
};