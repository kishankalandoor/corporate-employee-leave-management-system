import pino from 'pino';
import { Writable } from 'stream';
import { env } from './env.js';

const LOKI_URL = process.env.LOKI_URL || 'http://loki:3100/loki/api/v1/push';

// Buffer for batching log streams to Loki
const logBuffer: Array<[string, string]> = [];
let flushTimeout: NodeJS.Timeout | null = null;

async function flushToLoki() {
  flushTimeout = null;
  if (logBuffer.length === 0) return;
  const entries = logBuffer.splice(0, 100);

  try {
    const payload = {
      streams: [
        {
          stream: { job: 'lms-backend', service: 'lms-backend', env: env.NODE_ENV },
          values: entries,
        },
      ],
    };
    await fetch(LOKI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Non-blocking: fail silently if Loki is unavailable
  }
}

function queueLokiLog(line: string) {
  if (env.NODE_ENV === 'test') return;
  // Ensure nanosecond timestamp
  const nanoTime = `${Date.now()}${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
  logBuffer.push([nanoTime, line.trim()]);
  if (!flushTimeout && logBuffer.length > 0) {
    flushTimeout = setTimeout(() => {
      void flushToLoki();
    }, 500);
  }
}

const lokiStream = new Writable({
  write(chunk, _encoding, callback) {
    const str = chunk.toString();
    process.stdout.write(str);
    queueLokiLog(str);
    callback();
  },
});

export const logger = pino(
  {
    level: env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug',
    base: {
      service: 'lms-backend',
      env: env.NODE_ENV,
    },
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.passwordHash', '*.sessionSecret'],
      censor: '[REDACTED]',
    },
  },
  lokiStream
);
