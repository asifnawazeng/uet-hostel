import type { Timestamp } from 'firebase/firestore';

export type ComplaintStatus =
  | 'pending'
  | 'in-progress'
  | 'resolved'
  | 'withdrawn';

export type ComplaintPriority = 'low' | 'medium' | 'high';

export interface Complaint {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  description: string;
  category: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  adminResponse?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ComplaintInput = {
  subject: string;
  description: string;
  category: string;
  priority: ComplaintPriority;
};