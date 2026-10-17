import { createApp } from '@server/app';
import { env } from '@server/config/env';

// Process entry point: build the app and start listening.
// Kept separate from app.ts so the Express app can be imported without
// binding a port (useful for tests later).

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(
    `[server] UET Hostel Management API listening on http://localhost:${env.PORT}`
  );
  console.log(`[server] Environment: ${env.NODE_ENV}`);
  console.log(`[server] Health check: http://localhost:${env.PORT}/api/health`);
});

// Shut down cleanly so nodemon/tsx restarts do not leak the port.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`\n[server] ${signal} received, shutting down.`);
    server.close(() => process.exit(0));
  });
}
