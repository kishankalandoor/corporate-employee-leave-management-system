import { Request, Response, NextFunction } from 'express';
import {
  httpRequestsTotal,
  httpRequestDurationSeconds,
  httpRequestsInFlight,
} from './metrics.js';

function normalizeRoute(req: Request): string {
  // Use Express route pattern to avoid high cardinality from path params
  return req.route?.path ?? req.path.replace(/\/[0-9a-f]{24}/g, '/:id');
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  httpRequestsInFlight.inc();

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationSec = Number(durationNs) / 1e9;
    const route = normalizeRoute(req);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSec);
    httpRequestsInFlight.dec();
  });

  next();
}
