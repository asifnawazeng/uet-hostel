import type { Timestamp } from 'firebase/firestore';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
  adminRemarks?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LeaveRequestInput {
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
}

export interface LeaveRequestUpdate {
  status: LeaveStatus;
  adminRemarks?: string;
}