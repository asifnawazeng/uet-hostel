
import { useEffect, useState, type ReactNode } from 'react';

import { AdminSidebar } from '@/components/AdminSidebar';
import { StudentSidebar } from '@/components/StudentSidebar';
import {
  getAdminDashboardStats,
  getRecentDashboardActivity,
  type AdminDashboardStats,
  type DashboardActivity,
} from '@/features/dashboard/services/adminDashboardService';
import { useAuth } from '@/context/useAuth';
import type { UserRole } from '@/types/auth';

const studentNavItems = [
  {
    label: 'Room Information',
    path: '/student/room',
    icon: '⌂',
    description: 'Check your assigned hostel, room number, and bed details.',
  },
  {
    label: 'Mess Menu',
    path: '/student/mess',
    icon: '☕',
    description: 'View daily dining menus, meal timings, and weekly schedules.',
  },
  {
    label: 'Complaints',
    path: '/student/complaints',
    icon: '⚠',
    description: 'Submit maintenance requests, room repairs, and track status.',
  },
  {
    label: 'Leave Requests',
    path: '/student/leave',
    icon: '◷',
    description: 'Submit gate pass applications and track warden approvals.',
  },
  {
    label: 'Notices',
    path: '/student/notices',
    icon: '▣',
    description: 'Read official university circulars and hostel announcements.',
  },
  {
    label: 'Notifications',
    path: '/student/notifications',
    icon: '♢',
    description: 'View personal alerts, application status, and admin updates.',
  },
  {
    label: 'Profile',
    path: '/student/profile',
    icon: '♙',
    description: 'View and update your student contact information and details.',
  },
] as const;

export function DashboardPage({
  role,
  onNavigate,
}: {
  role: UserRole;
  onNavigate: (path: string) => void;
}) {
  const { currentUser, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout();
    onNavigate('/login');
  }

  if (role === 'admin') {
    return (
      <AdminDashboard
        currentUser={currentUser}
        isLoggingOut={isLoggingOut}
        onLogout={handleLogout}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <StudentSidebar
        currentPath="/student"
        onNavigate={onNavigate}
      />

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-6 lg:px-8">
            <div className="pl-16 lg:pl-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Student Portal
              </p>
              <h1 className="text-lg font-bold text-slate-950">
                Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">
                  {currentUser?.name}
                </p>
                <p className="text-xs text-slate-500">
                  {currentUser?.email}
                </p>
              </div>

              <button
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                disabled={isLoggingOut}
                onClick={() => void handleLogout()}
                type="button"
              >
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </header>

        <section className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {/* Hero Banner matching Admin design */}
            <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm sm:p-8">
              <p className="text-sm text-slate-400">Welcome back</p>
              <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
                {currentUser?.name} 👋
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Access your room assignment, mess menu, leave requests, hostel notices,
                and complaints from your student portal.
              </p>
            </div>

            {/* Quick Action Navigation Grid matching Admin Card styling */}
            <div className="mt-8">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">
                  Hostel Services & Navigation
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Direct access to all student residential features
                </p>
              </div>

              <nav
                aria-label="Student dashboard navigation"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {studentNavItems.map(({ label, path, icon, description }) => (
                  <button
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                    key={path}
                    onClick={() => onNavigate(path)}
                    type="button"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-lg font-medium text-slate-800 transition group-hover:bg-slate-900 group-hover:text-white">
                          {icon}
                        </span>

                        <span className="text-xs font-semibold text-slate-400 transition group-hover:text-slate-900">
                          Open →
                        </span>
                      </div>

                      <h4 className="mt-4 text-base font-bold text-slate-900 group-hover:text-slate-950">
                        {label}
                      </h4>

                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        {description}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-medium text-slate-400">
                      <span>{path}</span>
                      <span className="font-semibold text-slate-700 group-hover:text-slate-950">
                        Access service
                      </span>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminDashboard({
  currentUser,
  isLoggingOut,
  onLogout,
  onNavigate,
}: {
  currentUser: {
    name?: string;
    email?: string;
  } | null;
  isLoggingOut: boolean;
  onLogout: () => Promise<void>;
  onNavigate: (path: string) => void;
}) {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [activityError, setActivityError] = useState('');

  async function loadStats() {
    try {
      setIsLoadingStats(true);
      setStatsError('');
      const dashboardStats = await getAdminDashboardStats();
      setStats(dashboardStats);
    } catch (error) {
      setStatsError(
        error instanceof Error
          ? error.message
          : 'Unable to load dashboard statistics.'
      );
    } finally {
      setIsLoadingStats(false);
    }
  }

  async function loadActivity() {
    try {
      setIsLoadingActivity(true);
      setActivityError('');
      const recentActivity = await getRecentDashboardActivity();
      setActivities(recentActivity);
    } catch (error) {
      setActivityError(
        error instanceof Error
          ? error.message
          : 'Unable to load recent activity.'
      );
    } finally {
      setIsLoadingActivity(false);
    }
  }

  useEffect(() => {
    void loadStats();
    void loadActivity();
  }, []);

  const occupancyPercentage =
    stats && stats.totalCapacity > 0
      ? Math.round((stats.occupiedBeds / stats.totalCapacity) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-slate-100">
      <AdminSidebar
        currentPath="/admin"
        onNavigate={onNavigate}
      />

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-6 lg:px-8">
            <div className="pl-16 lg:pl-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Administration
              </p>
              <h1 className="text-lg font-bold text-slate-950">
                Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">
                  {currentUser?.name}
                </p>
                <p className="text-xs text-slate-500">
                  {currentUser?.email}
                </p>
              </div>

              <button
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                disabled={isLoggingOut}
                onClick={() => void onLogout()}
                type="button"
              >
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </header>

        <section className="px-6 py-8 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm sm:p-8">
              <p className="text-sm text-slate-400">Welcome back</p>
              <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
                {currentUser?.name} 👋
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Manage students, hostels, rooms, complaints,
                leave requests, mess operations, and reports
                from one place.
              </p>
            </div>

            {/* Dashboard statistics */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AdminDashboardCard
                label="Students"
                icon="👨‍🎓"
                value={
                  isLoadingStats
                    ? '...'
                    : stats
                      ? String(stats.students)
                      : '—'
                }
                description="Student records"
                onClick={() => onNavigate('/admin/students')}
              />

              <AdminDashboardCard
                label="Hostels"
                icon="🏢"
                value={
                  isLoadingStats
                    ? '...'
                    : stats
                      ? String(stats.hostels)
                      : '—'
                }
                description="Hostel management"
                onClick={() => onNavigate('/admin/hostels')}
              />

              <AdminDashboardCard
                label="Rooms"
                icon="🚪"
                value={
                  isLoadingStats
                    ? '...'
                    : stats
                      ? String(stats.rooms)
                      : '—'
                }
                description="Total rooms"
                onClick={() => onNavigate('/admin/rooms')}
              />

              <AdminDashboardCard
                label="Occupied Beds"
                icon="🛏️"
                value={
                  isLoadingStats
                    ? '...'
                    : stats
                      ? String(stats.occupiedBeds)
                      : '—'
                }
                description={
                  stats
                    ? `of ${stats.totalCapacity} total beds`
                    : 'Room occupancy'
                }
                onClick={() => onNavigate('/admin/reports')}
              />
            </div>

            {statsError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {statsError}
              </div>
            )}

            {/* Occupancy and pending actions */}
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">
                      Hostel Occupancy
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Current room and bed usage.
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-slate-950">
                    {isLoadingStats ? '...' : `${occupancyPercentage}%`}
                  </span>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all"
                    style={{ width: `${occupancyPercentage}%` }}
                  />
                </div>

                <div className="mt-4 flex justify-between text-sm text-slate-500">
                  <span>
                    Occupied:{' '}
                    {isLoadingStats ? '...' : stats?.occupiedBeds ?? 0}
                  </span>
                  <span>
                    Capacity:{' '}
                    {isLoadingStats ? '...' : stats?.totalCapacity ?? 0}
                  </span>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">
                  Pending Actions
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Items requiring your attention.
                </p>

                <div className="mt-5 space-y-3">
                  <button
                    className="flex w-full items-center justify-between rounded-lg bg-slate-50 p-3 text-left hover:bg-slate-100"
                    onClick={() => onNavigate('/admin/leave')}
                    type="button"
                  >
                    <span className="text-sm font-medium text-slate-700">
                      Leave requests
                    </span>
                    <span className="font-bold text-slate-950">
                      {isLoadingStats ? '...' : stats?.pendingLeaves ?? 0}
                    </span>
                  </button>

                  <button
                    className="flex w-full items-center justify-between rounded-lg bg-slate-50 p-3 text-left hover:bg-slate-100"
                    onClick={() => onNavigate('/admin/complaints')}
                    type="button"
                  >
                    <span className="text-sm font-medium text-slate-700">
                      Pending complaints
                    </span>
                    <span className="font-bold text-slate-950">
                      {isLoadingStats ? '...' : stats?.pendingComplaints ?? 0}
                    </span>
                  </button>

                  <button
                    className="flex w-full items-center justify-between rounded-lg bg-slate-50 p-3 text-left hover:bg-slate-100"
                    onClick={() => onNavigate('/admin/complaints')}
                    type="button"
                  >
                    <span className="text-sm font-medium text-slate-700">
                      In-progress complaints
                    </span>
                    <span className="font-bold text-slate-950">
                      {isLoadingStats ? '...' : stats?.inProgressComplaints ?? 0}
                    </span>
                  </button>
                </div>
              </section>
            </div>

            {/* Recent Activity */}
            <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Recent Activity
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Latest activity across your hostel system.
                  </p>
                </div>
                <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:block">
                  Latest 6
                </span>
              </div>

              {activityError && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {activityError}
                </div>
              )}

              {isLoadingActivity ? (
                <div className="mt-6 space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div className="flex items-center gap-4" key={item}>
                      <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
                      <div className="flex-1">
                        <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                        <div className="mt-2 h-3 w-64 animate-pulse rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="mt-6 rounded-lg bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No recent activity
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    New complaints, leave requests, and notices
                    will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-5 divide-y divide-slate-100">
                  {activities.map((activity) => (
                    <RecentActivityItem
                      activity={activity}
                      key={activity.id}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section className="mt-8">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-950">
                  Quick Actions
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Quickly access the most common administrative tasks.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <QuickActionCard
                  icon="👨‍🎓"
                  title="Manage Students"
                  description="View and manage student records."
                  onClick={() => onNavigate('/admin/students')}
                />

                <QuickActionCard
                  icon="🏢"
                  title="Manage Hostels"
                  description="Manage hostels and room assignments."
                  onClick={() => onNavigate('/admin/hostels')}
                />

                <QuickActionCard
                  icon="🚪"
                  title="Manage Rooms"
                  description="View rooms across all hostels."
                  onClick={() => onNavigate('/admin/rooms')}
                />

                <QuickActionCard
                  icon="⚠️"
                  title="Review Complaints"
                  description="Check and update student complaints."
                  onClick={() => onNavigate('/admin/complaints')}
                />

                <QuickActionCard
                  icon="📋"
                  title="Review Leave Requests"
                  description="Approve or reject leave requests."
                  onClick={() => onNavigate('/admin/leave')}
                />

                <QuickActionCard
                  icon="📢"
                  title="Publish Notice"
                  description="Create and manage hostel notices."
                  onClick={() => onNavigate('/admin/notices')}
                />

                <QuickActionCard
                  icon="📊"
                  title="View Reports"
                  description="View hostel management statistics."
                  onClick={() => onNavigate('/admin/reports')}
                />
              </div>
            </section>

            {/* Management and system panels */}
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <AdminDashboardPanel
                title="Management"
                description="Quick access to daily hostel operations."
              >
                <DashboardAction
                  label="Manage Students"
                  description="View and manage student records."
                  onClick={() => onNavigate('/admin/students')}
                />

                <DashboardAction
                  label="Manage Hostels"
                  description="Manage hostels and room assignments."
                  onClick={() => onNavigate('/admin/hostels')}
                />

                <DashboardAction
                  label="Manage Rooms"
                  description="View and manage rooms across all hostels."
                  onClick={() => onNavigate('/admin/rooms')}
                />

                <DashboardAction
                  label="Review Complaints"
                  description="Review and update student complaints."
                  onClick={() => onNavigate('/admin/complaints')}
                />

                <DashboardAction
                  label="Review Leave Requests"
                  description="Approve or reject student leave requests."
                  onClick={() => onNavigate('/admin/leave')}
                />
              </AdminDashboardPanel>

              <AdminDashboardPanel
                title="System"
                description="Communication and reporting tools."
              >
                <DashboardAction
                  label="Mess / Menu"
                  description="Manage hostel meals and menu items."
                  onClick={() => onNavigate('/admin/mess')}
                />

                <DashboardAction
                  label="Notices"
                  description="Create and manage hostel notices."
                  onClick={() => onNavigate('/admin/notices')}
                />

                <DashboardAction
                  label="Notifications"
                  description="Manage student notifications."
                  onClick={() => onNavigate('/admin/notifications')}
                />

                <DashboardAction
                  label="Reports"
                  description="View hostel management statistics."
                  onClick={() => onNavigate('/admin/reports')}
                />
              </AdminDashboardPanel>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function RecentActivityItem({
  activity,
  onNavigate,
}: {
  activity: DashboardActivity;
  onNavigate: (path: string) => void;
}) {
  const activityConfig = {
    leave: {
      icon: '🏖️',
      iconBackground: 'bg-amber-50',
      iconText: 'text-amber-700',
      path: '/admin/leave',
    },
    complaint: {
      icon: '⚠️',
      iconBackground: 'bg-red-50',
      iconText: 'text-red-700',
      path: '/admin/complaints',
    },
    notice: {
      icon: '📢',
      iconBackground: 'bg-blue-50',
      iconText: 'text-blue-700',
      path: '/admin/notices',
    },
  }[activity.type];

  return (
    <button
      className="flex w-full items-center gap-4 py-4 text-left transition hover:bg-slate-50"
      onClick={() => onNavigate(activityConfig.path)}
      type="button"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${activityConfig.iconBackground} ${activityConfig.iconText}`}
      >
        {activityConfig.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">
            {activity.title}
          </p>
          {activity.status && <ActivityStatus status={activity.status} />}
        </div>

        <p className="mt-1 truncate text-xs text-slate-500">
          {activity.description}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-xs text-slate-400">
          {formatActivityTime(activity.createdAt)}
        </p>
      </div>

      <span className="shrink-0 text-slate-300">→</span>
    </button>
  );
}

function ActivityStatus({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { label: string; className: string }
  > = {
    pending: {
      label: 'Pending',
      className: 'bg-amber-50 text-amber-700',
    },
    approved: {
      label: 'Approved',
      className: 'bg-emerald-50 text-emerald-700',
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-50 text-red-700',
    },
    'in-progress': {
      label: 'In Progress',
      className: 'bg-blue-50 text-blue-700',
    },
    resolved: {
      label: 'Resolved',
      className: 'bg-emerald-50 text-emerald-700',
    },
  };

  const config = statusConfig[status];

  if (!config) {
    return null;
  }

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function formatActivityTime(
  timestamp: DashboardActivity['createdAt']
) {
  if (!timestamp) {
    return 'Recently';
  }

  const date = timestamp.toDate();
  const now = new Date();
  const difference = now.getTime() - date.getTime();
  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}

function AdminDashboardCard({
  label,
  value,
  description,
  icon,
  onClick,
}: {
  label: string;
  value: string;
  description: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl transition group-hover:scale-105 group-hover:bg-slate-900">
          {icon}
        </div>
        <span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700">
          →
        </span>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </button>
  );
}

function QuickActionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      onClick={onClick}
      type="button"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl transition group-hover:scale-105 group-hover:bg-slate-900">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">
          {title}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>

      <span className="shrink-0 text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700">
        →
      </span>
    </button>
  );
}

function AdminDashboardPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-5 divide-y divide-slate-100">{children}</div>
    </section>
  );
}

function DashboardAction({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between gap-4 py-4 text-left hover:bg-slate-50"
      onClick={onClick}
      type="button"
    >
      <div>
        <p className="text-sm font-semibold text-slate-900">
          {label}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>
      <span className="text-slate-400">→</span>
    </button>
  );
}