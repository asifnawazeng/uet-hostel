// Vercel entry point. Build the existing TypeScript server first, then export
// the Express app without opening a listening port (serverless-compatible).
import { createApp } from './server/dist/app.js';

const app = createApp();

export default app;
