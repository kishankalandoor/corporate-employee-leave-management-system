import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: {
    service: 'lms-backend',
    env: env.NODE_ENV,
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.passwordHash', '*.sessionSecret'],
    censor: '[REDACTED]',
  },
});
