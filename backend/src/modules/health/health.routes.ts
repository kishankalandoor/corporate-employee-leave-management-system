import { Router, Request, Response } from 'express';
import { isDatabaseReady } from '../../config/database.js';
import { registry } from '../../observability/metrics.js';

const router = Router();

// GET /api/health — liveness
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'lms-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// GET /api/ready — readiness (includes dependency checks)
router.get('/ready', (_req: Request, res: Response) => {
  const dbReady = isDatabaseReady();
  const status = dbReady ? 'ready' : 'not_ready';
  const httpStatus = dbReady ? 200 : 503;

  res.status(httpStatus).json({
    status,
    checks: {
      database: dbReady ? 'ok' : 'error',
    },
    timestamp: new Date().toISOString(),
  });
});

// GET /metrics — Prometheus metrics (should be restricted by Nginx in production)
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  } catch {
    res.status(500).send('Failed to collect metrics');
  }
});

export default router;
