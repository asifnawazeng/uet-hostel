import { readFileSync } from 'node:fs';

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

import { env } from '@server/config/env';

// Firebase Admin SDK configuration (server side only).
//
// The Admin SDK bypasses Security Rules, so its credentials must never reach
// the browser. Only this file touches them.
//
// Until a service account is supplied the server still boots: the instances
// below stay `null` and callers can check `isFirebaseAdminConfigured`.

export const isFirebaseAdminConfigured = Boolean(
  env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  (env.FIREBASE_PROJECT_ID &&
    env.FIREBASE_CLIENT_EMAIL &&
    env.FIREBASE_PRIVATE_KEY)
);

interface ServiceAccountCredentials {
  projectId: string;
  project_id?: string;
  clientEmail: string;
  client_email?: string;
  privateKey: string;
  private_key?: string;
}

function loadServiceAccount(): ServiceAccountCredentials | null {
  if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const raw = readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
    const credentials = JSON.parse(raw) as Partial<ServiceAccountCredentials>;
    return {
      ...credentials,
      projectId: credentials.projectId ?? credentials.project_id ?? '',
      clientEmail: credentials.clientEmail ?? credentials.client_email ?? '',
      privateKey: credentials.privateKey ?? credentials.private_key ?? '',
    };
  }

  if (
    env.FIREBASE_PROJECT_ID &&
    env.FIREBASE_CLIENT_EMAIL &&
    env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      // Escaped newlines are common when keys are stored in .env files.
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;
let adminStorage: Storage | null = null;

if (isFirebaseAdminConfigured) {
  const credentials = loadServiceAccount();

  if (credentials) {
    adminApp =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: credentials.projectId,
          clientEmail: credentials.clientEmail,
          privateKey: credentials.privateKey,
        }),
        projectId: credentials.projectId,
        storageBucket: env.FIREBASE_STORAGE_BUCKET || undefined,
      });

    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
    adminStorage = getStorage(adminApp);
  }
} else {
  console.warn(
    '[firebase-admin] Not configured. Copy .env.example to .env ' +
      'and supply a service account to enable Firebase features.'
  );
}

export { adminApp, adminAuth, adminDb, adminStorage };
