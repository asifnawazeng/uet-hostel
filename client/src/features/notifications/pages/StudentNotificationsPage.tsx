import { useEffect, useState } from 'react';

import { useAuth } from '@/context/useAuth';
import { NotificationPushControls } from '@/features/notifications/components/NotificationPushControls';
import {
  listUserNotifications,
  markNotificationAsRead,
} from '@/features/notifications/services/NotificationService';
import type { Notification } from '@/features/notifications/types/notification';

export function StudentNotificationsPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { currentUser } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      if (!currentUser) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const records = await listUserNotifications(
          currentUser.uid
        );

        if (active) {
          setNotifications(records);
        }
      } catch (loadError: unknown) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load notifications.'
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadNotifications();

    const handleIncomingNotification = () => {
      void loadNotifications();
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadNotifications();
      }
    };

    window.addEventListener(
      'uet-hostel-notification',
      handleIncomingNotification
    );
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      active = false;
      window.removeEventListener(
        'uet-hostel-notification',
        handleIncomingNotification
      );
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [currentUser]);

  async function handleMarkAsRead(
    notification: Notification
  ) {
    if (notification.isRead) {
      return;
    }

    try {
      setUpdatingId(notification.id);
      setError(null);

      await markNotificationAsRead(notification.id);

      setNotifications((current) =>
        current.map((record) =>
          record.id === notification.id
            ? { ...record, isRead: true }
            : record
        )
      );
    } catch (updateError: unknown) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Unable to update the notification.'
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <button
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={() => onNavigate('/student')}
            type="button"
          >
            ← Back to dashboard
          </button>

          <div className="mt-1 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-950">
              Notifications
            </h1>

            <div className="mt-4">
              <NotificationPushControls />
            </div>

            <span className="text-sm text-slate-500">
              {notifications.filter(
                (notification) => !notification.isRead
              ).length}{' '}
              unread
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-8">
        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <p className="py-12 text-center text-sm text-slate-600">
            Loading notifications...
          </p>
        ) : null}

        {!isLoading && !error && notifications.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <h2 className="font-semibold text-slate-900">
              No notifications.
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              New notifications will appear here.
            </p>
          </div>
        ) : null}

        {!isLoading && !error && notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <article
                className={`rounded-xl border bg-white p-5 shadow-sm ${notification.isRead
                  ? 'border-slate-200'
                  : 'border-slate-400'
                  }`}
                key={notification.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-950">
                        {notification.title}
                      </h2>

                      {!notification.isRead ? (
                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
                          New
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-xs font-medium uppercase text-slate-500">
                      {notification.type}
                    </p>
                  </div>

                  {!notification.isRead ? (
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      disabled={updatingId === notification.id}
                      onClick={() =>
                        void handleMarkAsRead(notification)
                      }
                      type="button"
                    >
                      {updatingId === notification.id
                        ? 'Updating...'
                        : 'Mark as read'}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Read
                    </span>
                  )}
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {notification.message}
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}