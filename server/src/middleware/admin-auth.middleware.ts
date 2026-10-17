import type { NextFunction, Request, Response } from 'express';

import { authenticateFirebaseUser } from '@server/middleware/firebase-auth.middleware';

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const identity = await authenticateFirebaseUser(req, res, {
    unavailable: 'Firebase Admin is not configured.',
    unauthenticated: 'Sign in with an administrator account to continue.',
    invalid: 'Your session could not be verified. Sign in again.',
  });
  if (!identity) return;

  if (identity.role !== 'admin') {
    res.status(403).json({ message: 'Administrator access is required.' });
    return;
  }

  res.locals.uid = identity.uid;
  res.locals.userRole = identity.role;
  res.locals.email = identity.email;
  res.locals.emailVerified = identity.emailVerified;
  res.locals.adminUid = identity.uid;
  next();
}