import type { NextFunction, Request, Response } from 'express';

import {
  adminAuth,
  adminDb,
  isFirebaseAdminConfigured,
} from '@server/config/firebase';

interface AuthFailureMessages {
  unavailable: string;
  unauthenticated: string;
  invalid: string;
}

const defaultFailureMessages: AuthFailureMessages = {
  unavailable: 'Firebase Admin is not configured.',
  unauthenticated: 'Please sign in to continue.',
  invalid: 'Your session could not be verified. Please sign in again.',
};

export async function authenticateFirebaseUser(
  req: Request,
  res: Response,
  messages: AuthFailureMessages = defaultFailureMessages
): Promise<{
  uid: string;
  role: 'student' | 'admin';
  email?: string;
  emailVerified: boolean;
} | null> {
  if (!isFirebaseAdminConfigured || !adminAuth || !adminDb) {
    res.status(503).json({ message: messages.unavailable });
    return null;
  }

  const authorization = req.get('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';

  if (!token) {
    res.status(401).json({ message: messages.unauthenticated });
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const profile = await adminDb
      .collection('users')
      .doc(decoded.uid)
      .get();

    const role = profile.data()?.role;

    if (!profile.exists || (role !== 'student' && role !== 'admin')) {
      res.status(403).json({
        message: 'A valid student or administrator profile is required.',
      });
      return null;
    }

    return {
      uid: decoded.uid,
      role,
      email: decoded.email,
      emailVerified: decoded.email_verified === true,
    };
  } catch {
    res.status(401).json({ message: messages.invalid });
    return null;
  }
}

export async function requireFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const identity = await authenticateFirebaseUser(req, res);
  if (!identity) return;

  res.locals.uid = identity.uid;
  res.locals.userRole = identity.role;
  res.locals.email = identity.email;
  res.locals.emailVerified = identity.emailVerified;
  next();
}
