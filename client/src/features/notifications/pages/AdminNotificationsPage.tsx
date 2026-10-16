import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { useAuth } from '@/context/useAuth';
import { db } from '@/config/firebase';
import { NotificationPushControls } from '@/features/notifications/components/NotificationPushControls';
import {
  createNotification,
  listUserNotifications,
  markNotificationAsRead,
} from '@/features/notifications/services/NotificationService';
import type { Notification } from '@/features/notifications/types/notification';
import type { NotificationType } from '@/features/notifications/types/notification';

type StudentUser = {
  id: string;
  name: string;
  email: string;
};

export function AdminNotificationsPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { currentUser } = useAuth();

  const [userId, setUserId] = useState('');
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [updatingNotificationId, setUpdatingNotificationId] = useState<
    string | null
  >(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('system');

  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudents() {
      if (!db) {
        setIsLoadingStudents(false);
        setError('Firebase is not configured.');
        return;
      }

      try {
        setIsLoadingStudents(true);
        setError(null);

        const snapshot = await getDocs(
          query(
            collection(db, 'users'),
            where('role', '==', 'student')
          )
        );

        const records = snapshot.docs.map((studentDocument) => {
          const data = studentDocument.data();

          return {
            id: studentDocument.id,
            name: typeof data.name === 'string'
              ? data.name
              : 'Unnamed Student',
            email: typeof data.email === 'string'
              ? data.email
              : 'No email',
          };
        });

        setStudents(records);
      } catch (loadError: unknown) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load students.'
        );
      } finally {
        setIsLoadingStudents(false);
      }
    }

    void loadStudents();
  }, []);

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      if (!currentUser) {
        setIsLoadingNotifications(false);
        return;
      }

      try {
        const records = await listUserNotifications(currentUser.uid);
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
          setIsLoadingNotifications(false);
        }
      }
    }

    const refreshNotifications = () => {
      if (document.visibilityState === 'visible') {
        void loadNotifications();
      }
    };

    void loadNotifications();
    window.addEventListener(
      'uet-hostel-notification',
      refreshNotifications
    );
    window.addEventListener('focus', refreshNotifications);
    document.addEventListener('visibilitychange', refreshNotifications);

    return () => {
      active = false;
      window.removeEventListener(
        'uet-hostel-notification',
        refreshNotifications
      );
      window.removeEventListener('focus', refreshNotifications);
      document.removeEventListener('visibilitychange', refreshNotifications);
    };
  }, [currentUser]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser) {
      setError('You must be logged in as an administrator.');
      return;
    }

    if (!userId.trim() || !title.trim() || !message.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const result = await createNotification({
        userId: userId.trim(),
        title,
        message,
        type,
      });

      setUserId('');
      setTitle('');
      setMessage('');
      setType('system');

      setSuccess(
        result.pushFailed > 0
          ? `Notification saved. Push failed for ${result.pushFailed} device(s); the recipient can still see it in the app.`
          : result.pushDelivered > 0
            ? `Notification saved and sent to ${result.pushDelivered} device(s).`
            : 'Notification saved. The student has no registered browser device.'
      );
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to send notification.'
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkAsRead(notification: Notification) {
    if (notification.isRead) {
      return;
    }

    try {
      setUpdatingNotificationId(notification.id);
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
      setUpdatingNotificationId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <button
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => onNavigate('/admin')}
              type="button"
            >
              ← Back to dashboard
            </button>

          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Notifications
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Send a notification to a student.
          </p>

          <div className="mt-4">
            <NotificationPushControls />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-6 py-8">
        {success ? (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        ) : null}

        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={(event) => void handleSubmit(event)}
        >

          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="userId"
            >
              Student
            </label>

            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              disabled={isLoadingStudents}
              id="userId"
              onChange={(event) => setUserId(event.target.value)}
              value={userId}
            >
              <option value="">
                {isLoadingStudents
                  ? 'Loading students...'
                  : 'Select a student'}
              </option>

              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} — {student.email}
                </option>
              ))}
            </select>

            <p className="mt-1 text-xs text-slate-500">
              Select the student who should receive this notification.
            </p>
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="title"
            >
              Title
            </label>

            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              id="title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Notification title"
              value={title}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="message"
            >
              Message
            </label>

            <textarea
              className="min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              id="message"
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write your notification..."
              value={message}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="type"
            >
              Type
            </label>

            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              id="type"
              onChange={(event) =>
                setType(event.target.value as NotificationType)
              }
              value={type}
            >
              <option value="system">System</option>
              <option value="notice">Notice</option>
              <option value="complaint">Complaint</option>
            </select>
          </div>

          <button
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? 'Sending...' : 'Send Notification'}
          </button>
        </form>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-950">
            Your Notifications
          </h2>
          <span className="text-sm text-slate-500">
            {notifications.filter((notification) => !notification.isRead).length}{' '}
            unread
          </span>
        </div>

        {isLoadingNotifications ? (
          <p className="py-8 text-center text-sm text-slate-600">
            Loading notifications...
          </p>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="font-semibold text-slate-900">
              No notifications yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <article
                className={`rounded-xl border bg-white p-5 ${
                  notification.isRead
                    ? 'border-slate-200'
                    : 'border-slate-400'
                }`}
                key={notification.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-950">
                      {notification.title}
                    </h3>
                    <p className="mt-1 text-xs font-medium uppercase text-slate-500">
                      {notification.type}
                    </p>
                  </div>
                  {!notification.isRead ? (
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      disabled={updatingNotificationId === notification.id}
                      onClick={() => void handleMarkAsRead(notification)}
                      type="button"
                    >
                      {updatingNotificationId === notification.id
                        ? 'Updating...'
                        : 'Mark as read'}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500">Read</span>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {notification.message}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}