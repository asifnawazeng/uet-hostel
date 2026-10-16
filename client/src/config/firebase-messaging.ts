import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from 'firebase/messaging';

import { app } from '@/config/firebase';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export interface ForegroundNotification {
  title: string;
  message: string;
  type: 'notice' | 'complaint' | 'system';
}

function toForegroundNotification(
  payload: MessagePayload
): ForegroundNotification | null {
  const data = payload.data;
  const title = data?.title ?? payload.notification?.title;
  const message = data?.body ?? payload.notification?.body;
  const type = data?.type;

  if (
    !title ||
    !message ||
    (type !== 'notice' && type !== 'complaint' && type !== 'system')
  ) {
    return null;
  }

  return { title, message, type };
}

export async function listenForForegroundNotifications(
  onNotification: (notification: ForegroundNotification) => void
): Promise<() => void> {
  if (!app || !(await isSupported())) {
    return () => undefined;
  }

  return onMessage(getMessaging(app), (payload) => {
    const notification = toForegroundNotification(payload);
    if (notification) {
      onNotification(notification);
    }
  });
}

export async function requestFirebaseMessagingToken(): Promise<string | null> {
  if (!app) {
    throw new Error('Firebase is not configured for browser notifications.');
  }

  if (!vapidKey) {
    throw new Error('Set VITE_FIREBASE_VAPID_KEY in the project .env file.');
  }

  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator)
  ) {
    throw new Error('This browser does not support push notifications.');
  }

  try {
    if (!(await isSupported())) {
      throw new Error('This browser does not support Firebase push notifications.');
    }

    // This function should be called after the user clicks
    // a button to enable notifications.
    const permission = await window.Notification.requestPermission();

    if (permission !== 'granted') {
      throw new Error(
        'Browser notification permission was not granted. Allow notifications in your browser settings and try again.'
      );
    }

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    const params = new URLSearchParams();

    Object.entries(firebaseConfig).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    const serviceWorkerUrl = `/firebase-messaging-sw.js?${params.toString()}`;

    const registration = await navigator.serviceWorker.register(
      serviceWorkerUrl,
      { scope: '/' }
    );

    // Wait until the service worker is active.
    await navigator.serviceWorker.ready;

    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      throw new Error('Firebase did not return a browser notification token.');
    }

    return token;
  } catch (error) {
    console.error('Unable to enable browser push notifications:', error);

    throw error;
  }
}
