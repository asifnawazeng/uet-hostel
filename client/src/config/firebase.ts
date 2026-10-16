import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Firebase client configuration.
//
// All Firebase setup for the browser lives in this single file so that no other
// part of the client needs to know how the SDK is initialised.
//
// Vite only exposes variables prefixed with VITE_ to the browser bundle.
// These values are public by design - access control is enforced by Firebase
// Security Rules, never by hiding these keys.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * True when the Firebase environment variables are present.
 *
 * Until a Firebase project is created and `.env` is filled in, the app stays
 * runnable: the Firebase instances below are `null` instead of throwing.
 */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.warn(
    '[firebase] Not configured. Copy client/.env.example to client/.env and ' +
      'fill in your Firebase web app credentials.'
  );
}

export { app, auth, db };
