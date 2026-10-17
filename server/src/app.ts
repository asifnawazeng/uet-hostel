import cors from 'cors';
import express, { type Express } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env, isProduction } from '@server/config/env';
import { errorHandler, notFoundHandler } from '@server/middleware/error.middleware';
import { healthRouter } from '@server/routes/health.routes';
import { notificationRouter } from '@server/routes/notification.routes';
import { roomAssignmentRouter } from '@server/routes/room-assignment.routes';
import { studentRoomRouter } from '@server/routes/student-room.routes';
import { studentRequestRouter } from '@server/routes/student-request.routes';

// Express application assembly.
//
// API and feature routers are mounted under /api.

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', healthRouter);
  app.use('/api', notificationRouter);
  app.use('/api', roomAssignmentRouter);
  app.use('/api', studentRoomRouter);
  app.use('/api', studentRequestRouter);

  // Vercel serves files in the root public/ directory through its CDN and
  // runs this Express app as a serverless function. The prepare-vercel script
  // copies the Vite build into public/ before deployment. Keep express.static
  // enabled for the normal Node production server, but do not rely on it on
  // Vercel (where express.static is not used to serve public assets).
  const runningOnVercel = process.env.VERCEL === '1';

  if (isProduction || runningOnVercel) {
    const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
    const clientDist = runningOnVercel
      ? path.resolve(process.cwd(), 'public')
      : path.resolve(currentDirectory, '../../client/dist');

    if (!runningOnVercel) {
      app.use(express.static(clientDist));
    }

    // The frontend is a single-page application. Return index.html for
    // browser routes while leaving unknown API routes for the API 404 handler.
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }

      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
