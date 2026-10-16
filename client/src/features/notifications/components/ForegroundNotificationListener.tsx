import { useEffect, useState } from 'react';

import {
  listenForForegroundNotifications,
  type ForegroundNotification,
} from '@/config/firebase-messaging';
import { useAuth } from '@/context/useAuth';
import { playNotificationSound } from '@/features/notifications/services/notificationSound';

export function ForegroundNotificationListener() {
  const { currentUser } = useAuth();
  const [notification, setNotification] =
    useState<ForegroundNotification | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void listenForForegroundNotifications((incoming) => {
      if (!active) {
        return;
      }

      setNotification(incoming);
      playNotificationSound();
      window.dispatchEvent(
        new CustomEvent('uet-hostel-notification', { detail: incoming })
      );
    })
      .then((stopListening) => {
        if (active) {
          unsubscribe = stopListening;
        } else {
          stopListening();
        }
      })
      .catch((error: unknown) => {
        console.error(
          '[notifications] Unable to listen for foreground messages:',
          error
        );
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timeout = window.setTimeout(() => setNotification(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [notification]);

  if (!notification) {
    return null;
  }

  return (
    <aside
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
      role="status"
    >
      <p className="font-semibold text-slate-950">{notification.title}</p>
      <p className="mt-1 text-sm text-slate-700">{notification.message}</p>
    </aside>
  );
}
