import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/context/useAuth';
import { ForegroundNotificationListener } from '@/features/notifications/components/ForegroundNotificationListener';
import type { UserRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  role: UserRole;
  onRedirect: (path: string, replace?: boolean) => void;
}

export function ProtectedRoute({
  children,
  role,
  onRedirect,
}: ProtectedRouteProps) {
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !currentUser) onRedirect('/login', true);
  }, [currentUser, isLoading, onRedirect]);

  if (isLoading) return <StatusMessage message="Checking your session..." />;
  if (!currentUser) return null;

  if (currentUser.role !== role) {
    return (
      <StatusMessage
        message="You are not authorised to access this area."
        action={{ label: 'Go to your dashboard', onClick: () => onRedirect(`/${currentUser.role}`) }}
      />
    );
  }

  return (
    <>
      <ForegroundNotificationListener />
      {children}
    </>
  );
}

export function StatusMessage({
  message,
  action,
}: {
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <section className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-600">{message}</p>
        {action ? (
          <button
            className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            onClick={action.onClick}
            type="button"
          >
            {action.label}
          </button>
        ) : null}
      </section>
    </main>
  );
}