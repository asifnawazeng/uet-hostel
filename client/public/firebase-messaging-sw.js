importScripts(
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js'
);
importScripts(
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js'
);

// Firebase configuration will be provided during registration.
const params = new URL(self.location.href).searchParams;

const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket') || undefined,
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

const requiredValues = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
];

if (requiredValues.every(Boolean)) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title =
      payload.data?.title ||
      payload.notification?.title ||
      'Hostel notification';

    const body =
      payload.data?.body ||
      payload.notification?.body ||
      '';

    self.registration.showNotification(title, {
      body,
      data: {
        url: payload.data?.url || '/',
      },
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || '/',
    self.location.origin
  );

  // Only open pages on this application's own origin.
  if (targetUrl.origin !== self.location.origin) {
    return;
  }

  event.waitUntil(clients.openWindow(targetUrl.href));
});