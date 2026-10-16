import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/src/app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';

// Parse command line arguments (--port, --host) or fallback to defaults
const args = process.argv.slice(2);
const portArgIndex = args.indexOf('--port');
const hostArgIndex = args.indexOf('--host');

const PORT =
  portArgIndex !== -1 && args[portArgIndex + 1]
    ? Number(args[portArgIndex + 1])
    : 3000;
const HOST =
  hostArgIndex !== -1 && args[hostArgIndex + 1]
    ? args[hostArgIndex + 1]
    : '0.0.0.0';

async function startServer() {
  const app = createApp();
  const httpServer = http.createServer(app);

  if (!isProd) {
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, 'client/vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
      root: path.resolve(__dirname, 'client'),
    });
    app.use(vite.middlewares);
  } else {
    const clientDist = path.resolve(__dirname, 'client/dist');
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(clientDist, 'index.html'));
    });
  }

  httpServer.listen(PORT, HOST, () => {
    console.log(
      `[server] UET Hostel Management running on http://${HOST}:${PORT}`
    );
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      httpServer.close(() => process.exit(0));
    });
  }
}

startServer().catch((err) => {
  console.error('[server] Failed to start server:', err);
  process.exit(1);
});
