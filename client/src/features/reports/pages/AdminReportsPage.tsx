import { useEffect, useState } from 'react';

import { ReportCard } from '@/features/reports/components/ReportCard';
import { ReportChart } from '@/features/reports/components/ReportChart';
import { ReportSummaryCard } from '@/features/reports/components/ReportSummaryCard';
import { getReportSummary } from '@/features/reports/services/reportService';
import type { ReportSummary } from '@/features/reports/types/report';

export function AdminReportsPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function loadReports() {
    try {
      setIsLoading(true);
      setError(null);

      const summary = await getReportSummary();

      setReport(summary);
      setLastUpdated(new Date());
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load reports.'
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8 text-center text-sm text-slate-600">
        Loading reports...
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <div
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>

          <button
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => void loadReports()}
            type="button"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!report) {
    return null;
  }

  const occupancyPercentage =
    report.hostels.totalCapacity > 0
      ? Math.round(
        (report.hostels.occupiedBeds /
          report.hostels.totalCapacity) *
        100
      )
      : 0;

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <button
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => onNavigate('/admin')}
              type="button"
            >
              ← Back to dashboard
            </button>

            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              Reports Management
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              View an overview of students, hostels, rooms, leaves, and complaints.
            </p>

            {lastUpdated && (
              <p className="mt-2 text-xs text-slate-400">
                Last updated:{' '}
                {lastUpdated.toLocaleString()}
              </p>
            )}

          </div>

          <button
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => void loadReports()}
            type="button"
          >
            Refresh
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">

        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-950">
            Overview
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ReportSummaryCard
              title="Total Students"
              value={report.students.total}
              description="All registered students"
            />

            <ReportSummaryCard
              title="Total Hostels"
              value={report.hostels.totalHostels}
              description="Registered hostels"
            />

            <ReportSummaryCard
              title="Total Rooms"
              value={report.hostels.totalRooms}
              description="Registered rooms"
            />

            <ReportSummaryCard
              title="Occupied Beds"
              value={report.hostels.occupiedBeds}
              description="Currently occupied"
            />

            <ReportSummaryCard
              title="Occupancy Rate"
              value={occupancyPercentage}
              suffix="%"
              description="Percentage of beds currently occupied"
            />

            <ReportSummaryCard
              title="Pending Leaves"
              value={report.leaves.pending}
              description="Waiting for admin action"
            />

            <ReportSummaryCard
              title="Pending Complaints"
              value={report.complaints.pending}
              description="Waiting for action"
            />
          </div>


          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Overall Bed Occupancy
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {report.hostels.occupiedBeds} of{' '}
                  {report.hostels.totalCapacity} beds are currently occupied.
                </p>
              </div>

              <span className="text-lg font-bold text-slate-950">
                {occupancyPercentage}%
              </span>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-all duration-500"
                style={{ width: `${occupancyPercentage}%` }}
              />
            </div>
          </div>

        </section>

        <ReportSection title="Student Report">
          <ReportCard
            title="Total Students"
            value={report.students.total}
            description="All registered students"
          />

          <ReportCard
            title="Active Students"
            value={report.students.active}
            description="Currently active"
          />

          <ReportCard
            title="Inactive Students"
            value={report.students.inactive}
            description="Currently inactive"
          />

          <ReportCard
            title="Male Students"
            value={report.students.male}
            description="Male students"
          />

          <ReportCard
            title="Female Students"
            value={report.students.female}
            description="Female students"
          />

          <ReportChart
            title="Students by Department"
            items={report.students.byDepartment}
          />

          <ReportChart
            title="Students by Semester"
            items={report.students.bySemester.map((item) => ({
              label: `Semester ${item.label}`,
              count: item.count,
            }))}
          />

          <ReportChart
            title="Students by Hostel"
            items={report.students.byHostel}
          />
        </ReportSection>



        <ReportSection title="Hostel & Room Report">
          <ReportCard
            title="Total Hostels"
            value={report.hostels.totalHostels}
            description="Registered hostels"
          />

          <ReportCard
            title="Active Hostels"
            value={report.hostels.activeHostels}
            description="Currently active"
          />

          <ReportCard
            title="Total Rooms"
            value={report.hostels.totalRooms}
            description="All registered rooms"
          />

          <ReportCard
            title="Available Rooms"
            value={report.hostels.availableRooms}
            description="Rooms with available space"
          />

          <ReportCard
            title="Full Rooms"
            value={report.hostels.fullRooms}
            description="Rooms at full capacity"
          />

          <ReportCard
            title="Total Capacity"
            value={report.hostels.totalCapacity}
            description="Total available beds"
          />

          <ReportCard
            title="Occupied Beds"
            value={report.hostels.occupiedBeds}
            description="Currently occupied beds"
          />

          <ReportCard
            title="Available Beds"
            value={report.hostels.availableBeds}
            description="Beds still available"
          />

          <ReportChart
            title="Room Occupancy"
            items={[
              {
                label: 'Occupied Beds',
                count: report.hostels.occupiedBeds,
              },
              {
                label: 'Available Beds',
                count: report.hostels.availableBeds,
              },
            ]}
          />

        </ReportSection>

        <ReportSection title="Leave Report">
          <ReportCard
            title="Total Leave Requests"
            value={report.leaves.total}
            description="All leave requests"
          />

          <ReportCard
            title="Pending"
            value={report.leaves.pending}
            description="Waiting for admin action"
          />

          <ReportCard
            title="Approved"
            value={report.leaves.approved}
            description="Approved requests"
          />

          <ReportCard
            title="Rejected"
            value={report.leaves.rejected}
            description="Rejected requests"
          />

          <ReportChart
            title="Leave Requests by Status"
            items={[
              {
                label: 'Pending',
                count: report.leaves.pending,
              },
              {
                label: 'Approved',
                count: report.leaves.approved,
              },
              {
                label: 'Rejected',
                count: report.leaves.rejected,
              },
            ]}
          />
        </ReportSection>

        <ReportSection title="Complaint Report">
          <ReportCard
            title="Total Complaints"
            value={report.complaints.total}
            description="All submitted complaints"
          />

          <ReportCard
            title="Pending"
            value={report.complaints.pending}
            description="Waiting for action"
          />

          <ReportCard
            title="In Progress"
            value={report.complaints.inProgress}
            description="Currently being handled"
          />

          <ReportCard
            title="Resolved"
            value={report.complaints.resolved}
            description="Successfully resolved"
          />

          <ReportChart
            title="Complaints by Status"
            items={[
              {
                label: 'Pending',
                count: report.complaints.pending,
              },
              {
                label: 'In Progress',
                count: report.complaints.inProgress,
              },
              {
                label: 'Resolved',
                count: report.complaints.resolved,
              },
            ]}
          />
        </ReportSection>
      </section>
    </main>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-slate-950">
        {title}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
    </section>
  );
}