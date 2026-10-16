import 'dotenv/config';

import { z } from 'zod';

// Environment configuration.
//
// Loaded once at startup and validated eagerly so the server fails fast with a
// clear message instead of breaking later at an unpredictable point.
//
// Firebase Admin credentials are optional for now: Phase 2 only needs the app
// to boot. They become required once the auth module is implemented.

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(5000),

  /** Origins allowed to call the API, comma separated. */
  CLIENT_ORIGIN: z.preprocess(
    (value) =>
      typeof value === 'string' && !value.trim()
        ? undefined
        : value,
    z
      .string()
      .min(1)
      .default('http://localhost:3000,http://localhost:5173')
  ),

  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    '[config] Invalid environment variables:',
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  CLIENT_ORIGIN: raw.CLIENT_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';