import { collection, getDocs } from 'firebase/firestore';

import { db } from '@/config/firebase';
import { calculateRoomCapacityMetrics } from '@/utils/roomMetrics';
import type {
  ComplaintReport,
  HostelReport,
  LeaveReport,
  ReportBreakdown,
  ReportSummary,
  StudentReport,
} from '@/features/reports/types/report';

function getDatabase() {
  if (!db) {
    throw new Error(
      'Reports are unavailable because Firebase is not configured.'
    );
  }

  return db;
}

function createBreakdown(values: string[]): ReportBreakdown[] {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    const label = value.trim();

    if (!label) {
      return;
    }

    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({
      label,
      count,
    }))
    .sort((first, second) => {
      if (second.count !== first.count) {
        return second.count - first.count;
      }

      return first.label.localeCompare(second.label);
    });
}

export async function getReportSummary(): Promise<ReportSummary> {
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

  const departments: string[] = [];
  const semesters: string[] = [];
  const studentHostels: string[] = [];

  const students: StudentReport = {
    total: studentsSnapshot.size,
    active: 0,
    inactive: 0,
    male: 0,
    female: 0,
    byDepartment: [],
    bySemester: [],
    byHostel: [],
  };

  studentsSnapshot.forEach((document) => {
    const student = document.data();

    if (student.status === 'active') {
      students.active += 1;
    } else if (student.status === 'inactive') {
      students.inactive += 1;
    }

    if (student.gender === 'Male') {
      students.male += 1;
    } else if (student.gender === 'Female') {
      students.female += 1;
    }

    if (typeof student.department === 'string') {
      departments.push(student.department);
    }

    if (
      typeof student.semester === 'number' ||
      typeof student.semester === 'string'
    ) {
      semesters.push(String(student.semester));
    }

    if (typeof student.hostel === 'string') {
      studentHostels.push(student.hostel);
    }
  });

  students.byDepartment = createBreakdown(departments);

  students.bySemester = createBreakdown(semesters).sort(
    (first, second) => Number(first.label) - Number(second.label)
  );

  students.byHostel = createBreakdown(studentHostels);

  let totalRooms = 0;
  let availableRooms = 0;
  let fullRooms = 0;
  let inactiveRooms = 0;

  roomsSnapshot.forEach((document) => {
    const room = document.data();

    totalRooms += 1;

    if (room.status === 'inactive') {
      inactiveRooms += 1;
    } else if (room.status === 'full') {
      fullRooms += 1;
    } else {
      availableRooms += 1;
    }
  });

  const { totalCapacity, occupiedBeds } = calculateRoomCapacityMetrics(
    roomsSnapshot.docs
  );

  let activeHostels = 0;
  let inactiveHostels = 0;

  hostelsSnapshot.forEach((document) => {
    const hostel = document.data();

    if (hostel.status === 'active') {
      activeHostels += 1;
    } else if (hostel.status === 'inactive') {
      inactiveHostels += 1;
    }
  });

  const hostels: HostelReport = {
    totalHostels: hostelsSnapshot.size,
    activeHostels,
    inactiveHostels,
    totalRooms,
    availableRooms,
    fullRooms,
    inactiveRooms,
    totalCapacity,
    occupiedBeds,
    availableBeds: Math.max(totalCapacity - occupiedBeds, 0),
  };

  const leaves: LeaveReport = {
    total: leavesSnapshot.size,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  leavesSnapshot.forEach((document) => {
    const leave = document.data();

    if (leave.status === 'pending') {
      leaves.pending += 1;
    } else if (leave.status === 'approved') {
      leaves.approved += 1;
    } else if (leave.status === 'rejected') {
      leaves.rejected += 1;
    }
  });

  const complaints: ComplaintReport = {
    total: complaintsSnapshot.size,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  };

  complaintsSnapshot.forEach((document) => {
    const complaint = document.data();

    if (complaint.status === 'pending') {
      complaints.pending += 1;
    } else if (complaint.status === 'in-progress') {
      complaints.inProgress += 1;
    } else if (complaint.status === 'resolved') {
      complaints.resolved += 1;
    }
  });

  return {
    students,
    hostels,
    leaves,
    complaints,
  };
}
