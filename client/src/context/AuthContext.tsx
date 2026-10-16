import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useEffect, useState, type ReactNode } from 'react';

import { auth, db, isFirebaseConfigured } from '@/config/firebase';
import type { UserProfile } from '@/types/auth';

interface AuthContextValue {
  currentUser: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(auth && db));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth || !db) return;

    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!active) return;

      setIsLoading(true);
      setError(null);

      try {
        const profile = firebaseUser ? await loadUserProfile(firebaseUser) : null;
        if (active) setCurrentUser(profile);
      } catch (authError: unknown) {
        if (active) {
          setCurrentUser(null);
          setError(getAuthErrorMessage(authError));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    });

    setPersistence(auth, browserLocalPersistence).catch((persistenceError) => {
      if (active) setError(getAuthErrorMessage(persistenceError));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function login(email: string, password: string) {
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Authentication is not configured yet.');
    }

    setError(null);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await loadUserProfile(credential.user);
    setCurrentUser(profile);
    return profile;
  }

  async function logout() {
    if (auth) await firebaseSignOut(auth);
    setCurrentUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        error,
        login: async (email, password) => {
          try {
            return await login(email, password);
          } catch (authError: unknown) {
            const message = getAuthErrorMessage(authError);
            setError(message);
            throw new Error(message, { cause: authError });
          }
        },
        logout,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

async function loadUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile> {
  if (!db) throw new Error('User profile storage is not configured.');

  const profileSnapshot = await getDoc(doc(db, 'users', firebaseUser.uid));
  const profile = profileSnapshot.data();
  const role = profile?.role;

  if (role !== 'student' && role !== 'admin') {
    throw new Error('Your account does not have an authorised hostel role.');
  }

  return {
    uid: firebaseUser.uid,
    name:
      typeof profile?.name === 'string' && profile.name.trim()
        ? profile.name
        : (firebaseUser.displayName ?? firebaseUser.email ?? 'User'),
    email: firebaseUser.email ?? '',
    role,
  };
}

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Unable to complete authentication.';

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'The email or password is incorrect.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
    case 'unavailable':
    case 'deadline-exceeded':
      return 'Unable to connect right now. Check your internet connection and try again.';
    case 'permission-denied':
      return 'Your user profile cannot be read. Contact an administrator.';
    default:
      return code ? 'Unable to complete authentication. Please try again.' : error.message;
  }
}