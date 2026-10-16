import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { calculateRoomCapacityMetrics } from '@/utils/roomMetrics';

export interface AdminDashboardStats {
  students: number;
  hostels: number;
  rooms: number;
  occupiedBeds: number;
  totalCapacity: number;
  pendingLeaves: number;
  pendingComplaints: number;
  inProgressComplaints: number;
}

export type ActivityType = 'leave' | 'complaint' | 'notice';

export interface DashboardActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  status?: string;
  createdAt: Timestamp | null;
}

function getDatabase() {
  if (!db) {
    throw new Error(
      'Dashboard data is unavailable because Firebase is not configured.'
    );
  }

  return db;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const database = getDatabase();

  const [
    studentsSnapshot,
    hostelsSnapshot,
    roomsSnapshot,
    leavesSnapshot,
    complaintsSnapshot,
  ] = await Promise.all([
    getDocs(collection(database, 'students')),
    getDocs(collection(database, 'hostels')),
    getDocs(collection(database, 'rooms')),
    getDocs(collection(database, 'leaveRequests')),
    getDocs(collection(database, 'complaints')),
  ]);

  const { totalCapacity, occupiedBeds } = calculateRoomCapacityMetrics(
    roomsSnapshot.docs
  );

  let pendingLeaves = 0;

  leavesSnapshot.forEach((document) => {
    if (document.data().status === 'pending') {
      pendingLeaves += 1;
    }
  });

  let pendingComplaints = 0;
  let inProgressComplaints = 0;

  complaintsSnapshot.forEach((document) => {
    const status = document.data().status;

    if (status === 'pending') {
      pendingComplaints += 1;
    }

    if (status === 'in-progress') {
      inProgressComplaints += 1;
    }
  });

  return {
    students: studentsSnapshot.size,
    hostels: hostelsSnapshot.size,
    rooms: roomsSnapshot.size,
    occupiedBeds,
    totalCapacity,
    pendingLeaves,
    pendingComplaints,
    inProgressComplaints,
  };
}

export async function getRecentDashboardActivity(): Promise<
  DashboardActivity[]
> {
  const database = getDatabase();

  const [leavesSnapshot, complaintsSnapshot, noticesSnapshot] =
    await Promise.all([
      getDocs(
        query(
          collection(database, 'leaveRequests'),
          orderBy('createdAt', 'desc'),
          limit(5)
        )
      ),
      getDocs(
        query(
          collection(database, 'complaints'),
          orderBy('createdAt', 'desc'),
          limit(5)
        )
      ),
      getDocs(
        query(
          collection(database, 'notices'),
          orderBy('createdAt', 'desc'),
          limit(5)
        )
      ),
    ]);

  const activities: DashboardActivity[] = [];

  leavesSnapshot.forEach((document) => {
    const leave = document.data();

    activities.push({
      id: `leave-${document.id}`,
      type: 'leave',
      title: 'Leave request',
      description:
        typeof leave.studentName === 'string'
          ? `${leave.studentName} submitted a leave request`
          : 'A student submitted a leave request',
      status:
        typeof leave.status === 'string'
          ? leave.status
          : undefined,
      createdAt:
        leave.createdAt instanceof Timestamp
          ? leave.createdAt
          : null,
    });
  });

  complaintsSnapshot.forEach((document) => {
    const complaint = document.data();

    activities.push({
      id: `complaint-${document.id}`,
      type: 'complaint',
      title: 'Complaint',
      description:
        typeof complaint.studentName === 'string'
          ? `${complaint.studentName} submitted a complaint`
          : 'A student submitted a complaint',
      status:
        typeof complaint.status === 'string'
          ? complaint.status
          : undefined,
      createdAt:
        complaint.createdAt instanceof Timestamp
          ? complaint.createdAt
          : null,
    });
  });

  noticesSnapshot.forEach((document) => {
    const notice = document.data();

    activities.push({
      id: `notice-${document.id}`,
      type: 'notice',
      title: 'Notice published',
      description:
        typeof notice.title === 'string'
          ? notice.title
          : 'A new notice was published',
      createdAt:
        notice.createdAt instanceof Timestamp
          ? notice.createdAt
          : null,
    });
  });

  return activities
    .sort((first, second) => {
      const firstTime = first.createdAt?.toMillis() ?? 0;
      const secondTime = second.createdAt?.toMillis() ?? 0;

      return secondTime - firstTime;
    })
    .slice(0, 6);
}