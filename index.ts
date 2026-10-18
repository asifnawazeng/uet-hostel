// Vercel entry point. Build the existing TypeScript server first, then expor
import express from 'express';
import { createApp } from './server/dist/app.js';

const app: ReturnType<typeof express> = createApp();

export default app;