import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('Leave Management System'),
  APP_PORT: z.coerce.number().default(4000),
  APP_TIMEZONE: z.string().default('Asia/Kolkata'),
  PUBLIC_APP_URL: z.string().url().default('http://localhost'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_COOKIE_NAME: z.string().default('lms_session'),
  SESSION_MAX_AGE_MS: z.coerce.number().default(86400000),

  SEED_DEMO_DATA: z.string().transform((v) => v === 'true').default('false'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(500),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(100),

  LOKI_URL: z.string().optional(),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();
export type Env = typeof env;
