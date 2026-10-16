export interface ReportBreakdown {
  label: string;
  count: number;
}

export interface StudentReport {
  total: number;
  active: number;
  inactive: number;
  male: number;
  female: number;
  byDepartment: ReportBreakdown[];
  bySemester: ReportBreakdown[];
  byHostel: ReportBreakdown[];
}

export interface HostelReport {
  totalHostels: number;
  activeHostels: number;
  inactiveHostels: number;
  totalRooms: number;
  availableRooms: number;
  fullRooms: number;
  inactiveRooms: number;
  totalCapacity: number;
  occupiedBeds: number;
  availableBeds: number;
}

export interface LeaveReport {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface ComplaintReport {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}

export interface ReportSummary {
  students: StudentReport;
  hostels: HostelReport;
  leaves: LeaveReport;
  complaints: ComplaintReport;
}