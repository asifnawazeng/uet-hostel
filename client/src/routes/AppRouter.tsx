import { useCallback, useEffect, useState } from 'react';

import { ProtectedRoute, StatusMessage } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/useAuth';

import { StudentRoomPage } from '@/features/rooms/pages/StudentRoomPage';
import { StudentLeavePage } from '@/features/leave/pages/StudentLeavePage';
import { AdminLeavePage } from '@/features/leave/pages/AdminLeavePage';
import { StudentProfilePage } from '@/features/profile/pages/StudentProfilePage';

import {
  HostelDetailsPage,
  HostelFormPage,
  HostelListPage,
} from '@/features/hostels';

import {
  RoomDetailsPage,
  RoomFormPage,
  RoomListPage,
} from '@/features/rooms';

import { StudentRoomChangePage } from '@/features/students/pages/StudentRoomChangePage';

import { StudentComplaintsPage } from '@/features/complaints/pages/StudentComplaintsPage';
import { AdminComplaintsPage } from '@/features/complaints/pages/AdminComplaintsPage';

import { AdminNoticesPage } from '@/features/notices/pages/AdminNoticesPage.tsx';
import { StudentNoticesPage } from '@/features/notices/pages/StudentNoticesPage.tsx';

import { AdminNotificationsPage } from '@/features/notifications/pages/AdminNotificationsPage';
import { StudentNotificationsPage } from '@/features/notifications/pages/StudentNotificationsPage';

import { AdminMessPage } from '@/features/mess/pages/AdminMessPage';
import { StudentMessPage } from '@/features/mess/pages/StudentMessPage';

import { AdminReportsPage } from '@/features/reports/pages/AdminReportsPage';

import {
  StudentDetailsPage,
  StudentFormPage,
  StudentListPage,
} from '@/features/students';
import { AdminAllRoomsPage } from '@/features/rooms/pages/AdminAllRoomsPage';

import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';

import type { UserRole } from '@/types/auth';

export function AppRouter() {
  const { currentUser, isLoading } = useAuth();

  const [path, setPath] = useState(() => window.location.pathname);

  const navigate = useCallback(
    (nextPath: string, replace = false) => {
      if (replace) {
        window.history.replaceState({}, '', nextPath);
      } else {
        window.history.pushState({}, '', nextPath);
      }

      setPath(nextPath);
    },
    []
  );

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);

    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (isLoading) {
    return <StatusMessage message="Loading your account..." />;
  }

  if (path === '/login') {
    if (currentUser) {
      return (
        <RedirectByRole
          role={currentUser.role}
          onRedirect={navigate}
        />
      );
    }

    return (
      <LoginPage
        onSuccess={(role) => navigate(`/${role}`, true)}
      />
    );
  }

  if (path === '/' || path === '') {
    if (!currentUser) {
      return (
        <LoginPage
          onSuccess={(role) => navigate(`/${role}`, true)}
        />
      );
    }

    return (
      <RedirectByRole
        role={currentUser.role}
        onRedirect={navigate}
      />
    );
  }

  const role =
    path.startsWith('/admin')
      ? 'admin'
      : path.startsWith('/student')
        ? 'student'
        : null;

  const hostelRoute =
    role === 'admin'
      ? matchHostelRoute(path)
      : null;

  const studentRoomChangeMatch =
    role === 'admin'
      ? path.match(/^\/admin\/students\/([^/]+)\/room$/)
      : null;

  if (!role) {
    return (
      <StatusMessage
        message="The page you requested could not be found."
        action={{
          label: 'Go to login',
          onClick: () => navigate('/login', true),
        }}
      />
    );
  }

  return (
    <ProtectedRoute role={role} onRedirect={navigate}>
      {path === `/${role}` ? (
        <DashboardPage
          role={role}
          onNavigate={navigate}
        />
      ) : role === 'admin' && path === '/admin/rooms' ? (
        <AdminAllRoomsPage onNavigate={navigate} />
      ) : hostelRoute?.kind === 'list' ? (
        <HostelListPage onNavigate={navigate} />
      ) : hostelRoute?.kind === 'add' ? (
        <HostelFormPage onNavigate={navigate} />
      ) : hostelRoute?.kind === 'edit' ? (
        <HostelFormPage
          hostelId={hostelRoute.hostelId}
          onNavigate={navigate}
        />
      ) : hostelRoute?.kind === 'details' ? (
        <HostelDetailsPage
          hostelId={hostelRoute.hostelId}
          onNavigate={navigate}
        />
      ) : hostelRoute?.kind === 'rooms' ? (
        <RoomListPage
          hostelId={hostelRoute.hostelId}
          onNavigate={navigate}
        />
      ) : hostelRoute?.kind === 'roomAdd' ? (
        <RoomFormPage
          hostelId={hostelRoute.hostelId}
          onNavigate={navigate}
        />
      ) : hostelRoute?.kind === 'roomEdit' ? (
        <RoomFormPage
          hostelId={hostelRoute.hostelId}
          roomId={hostelRoute.roomId}
          onNavigate={navigate}
        />
      ) : hostelRoute?.kind === 'roomDetails' ? (
        <RoomDetailsPage
          hostelId={hostelRoute.hostelId}
          roomId={hostelRoute.roomId ?? ''}
          onNavigate={navigate}
        />
      ) : role === 'student' && path === '/student/complaints' ? (
        <StudentComplaintsPage onNavigate={navigate} />
      ) : role === 'student' && path === '/student/notices' ? (
        <StudentNoticesPage onNavigate={navigate} />
      ) : role === 'student' && path === '/student/mess' ? (
        <StudentMessPage onNavigate={navigate} />
      ) : role === 'admin' && studentRoomChangeMatch ? (
        <StudentRoomChangePage
          studentId={studentRoomChangeMatch[1]}
          onNavigate={navigate}
        />
      ) : role === 'admin' && path === '/admin/reports' ? (
        <AdminReportsPage onNavigate={navigate} />
      ) : role === 'student' && path === '/student/room' ? (
        <StudentRoomPage onNavigate={navigate} />
      ) : role === 'student' && path === '/student/leave' ? (
        <StudentLeavePage onNavigate={navigate} />
      ) : path === `/${role}/profile` ? (
        <StudentProfilePage onNavigate={navigate} />
      ) : role === 'student' && path === '/student/notifications' ? (
        <StudentNotificationsPage onNavigate={navigate} />
      ) : role === 'admin' && path === '/admin/leave' ? (
        <AdminLeavePage onNavigate={navigate} />
      ) : role === 'admin' && path === '/admin/notifications' ? (
        <AdminNotificationsPage onNavigate={navigate} />
      ) : role === 'admin' && path === '/admin/mess' ? (
        <AdminMessPage onNavigate={navigate} />
      ) : role === 'admin' && path === '/admin/notices' ? (
        <AdminNoticesPage onNavigate={navigate} />
      ) : role === 'admin' && path === '/admin/complaints' ? (
        <AdminComplaintsPage onNavigate={navigate} />
      ) : role === 'admin' && path === '/admin/students' ? (
        <StudentListPage onNavigate={navigate} />
      ) : role === 'admin' && path === '/admin/students/add' ? (
        <StudentFormPage onNavigate={navigate} />
      ) : role === 'admin' && matchStudentRoute(path)?.kind === 'edit' ? (
        <StudentFormPage
          studentId={matchStudentRoute(path)?.id}
          onNavigate={navigate}
        />
      ) : role === 'admin' && matchStudentRoute(path)?.kind === 'details' ? (
        <StudentDetailsPage
          studentId={matchStudentRoute(path)?.id ?? ''}
          onNavigate={navigate}
        />
      ) : (
        <StatusMessage
          message="The page you requested could not be found."
          action={{
            label: 'Back to dashboard',
            onClick: () => navigate(`/${role}`),
          }}
        />
      )}
    </ProtectedRoute>
  );
}

function RedirectByRole({
  role,
  onRedirect,
}: {
  role: UserRole;
  onRedirect: (path: string, replace?: boolean) => void;
}) {
  useEffect(() => {
    onRedirect(`/${role}`, true);
  }, [onRedirect, role]);

  return <StatusMessage message="Opening your dashboard..." />;
}

function matchStudentRoute(
  path: string
): { id: string; kind: 'details' | 'edit' } | null {
  const match = path.match(
    /^\/admin\/students\/([^/]+)(?:\/(edit))?\/?$/
  );

  if (!match?.[1]) {
    return null;
  }

  try {
    return {
      id: decodeURIComponent(match[1]),
      kind: match[2] ? 'edit' : 'details',
    };
  } catch {
    return null;
  }
}

function matchHostelRoute(path: string): {
  kind:
  | 'list'
  | 'add'
  | 'details'
  | 'edit'
  | 'rooms'
  | 'roomAdd'
  | 'roomDetails'
  | 'roomEdit';
  hostelId: string;
  roomId?: string;
} | null {
  if (
    path === '/admin/hostels' ||
    path === '/admin/hostels/'
  ) {
    return {
      kind: 'list',
      hostelId: '',
    };
  }

  if (path === '/admin/hostels/add') {
    return {
      kind: 'add',
      hostelId: '',
    };
  }

  const patterns = [
    {
      regex:
        /^\/admin\/hostels\/([^/]+)\/rooms\/([^/]+)\/edit\/?$/,
      kind: 'roomEdit' as const,
    },
    {
      regex:
        /^\/admin\/hostels\/([^/]+)\/rooms\/add\/?$/,
      kind: 'roomAdd' as const,
    },
    {
      regex:
        /^\/admin\/hostels\/([^/]+)\/rooms\/([^/]+)\/?$/,
      kind: 'roomDetails' as const,
    },
    {
      regex:
        /^\/admin\/hostels\/([^/]+)\/rooms\/?$/,
      kind: 'rooms' as const,
    },
    {
      regex:
        /^\/admin\/hostels\/([^/]+)\/edit\/?$/,
      kind: 'edit' as const,
    },
    {
      regex:
        /^\/admin\/hostels\/([^/]+)\/?$/,
      kind: 'details' as const,
    },
  ];

  for (const { regex, kind } of patterns) {
    const match = path.match(regex);

    if (!match?.[1]) {
      continue;
    }

    try {
      const result = {
        kind,
        hostelId: decodeURIComponent(match[1]),
      };

      if (kind === 'roomAdd' || kind === 'rooms') {
        return result;
      }

      if (kind === 'roomEdit' || kind === 'roomDetails') {
        if (!match[2]) {
          return null;
        }

        return {
          ...result,
          roomId: decodeURIComponent(match[2]),
        };
      }

      return result;
    } catch {
      return null;
    }
  }

  return null;
}
