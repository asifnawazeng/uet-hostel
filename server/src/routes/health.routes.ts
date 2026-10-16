import { Router, type Request, type Response } from 'express';

import { env } from '@/config/env';
import { isFirebaseAdminConfigured } from '@/config/firebase';

// Health endpoint.
//
// Used by the client to confirm it can reach the API, and later by deployment
// tooling. It reports configuration state but never returns secrets.

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'uet-hostel-management-api',
    environment: env.NODE_ENV,
    firebase: isFirebaseAdminConfigured ? 'configured' : 'not-configured',
    timestamp: new Date().toISOString(),
  });
});
