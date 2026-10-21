import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
// Note: CSRF protection is handled by SameSite=lax cookie setting

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { loadUser } from './middleware/session.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { metricsMiddleware } from './observability/metrics.middleware.js';
import { registry } from './observability/metrics.js';

// Route modules
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import departmentRoutes from './modules/departments/departments.routes.js';
import leaveTypeRoutes from './modules/leave-types/leave-types.routes.js';
import leaveRequestRoutes from './modules/leave-requests/leave-requests.routes.js';
import approvalRoutes from './modules/approvals/approvals.routes.js';
import leaveBalanceRoutes from './modules/leave-balances/leave-balances.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';
import healthRoutes from './modules/health/health.routes.js';
import holidayRoutes from './modules/holidays/holidays.routes.js';

export function createApp() {
  const app = express();

  // Trust proxy — Nginx sets X-Forwarded-For
  app.set('trust proxy', 1);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // SPA handles CSP
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS — only allow same-origin through Nginx in production
  app.use(
    cors({
      origin: env.NODE_ENV === 'development' ? ['http://localhost:5173', 'http://localhost'] : env.PUBLIC_APP_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Requested-With'],
    })
  );

  // Compression
  app.use(compression());

  // Request size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // MongoDB sanitization — prevent NoSQL injection
  app.use(mongoSanitize());

  // Prometheus metrics
  app.use(metricsMiddleware);

  // Session
  app.use(
    session({
      name: env.SESSION_COOKIE_NAME,
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: env.SESSION_MAX_AGE_MS / 1000,
        autoRemove: 'native',
      }),
      cookie: {
        httpOnly: true,
        secure: env.PUBLIC_APP_URL.startsWith('https://'),
        sameSite: 'lax',
        maxAge: env.SESSION_MAX_AGE_MS,
      },
    })
  );

  // Load authenticated user into req.user
  app.use(loadUser);

  // Global rate limiting
  app.use(
    '/api/',
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests. Please slow down.' },
    })
  );

  // Health and metrics (no auth required)
  app.use('/api', healthRoutes);
  app.get('/metrics', async (_req, res) => {
    try {
      res.set('Content-Type', registry.contentType);
      res.end(await registry.metrics());
    } catch {
      res.status(500).send('Failed to collect metrics');
    }
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/employees', userRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/leave-types', leaveTypeRoutes);
  app.use('/api/leaves', leaveRequestRoutes);
  app.use('/api/approvals', approvalRoutes);
  app.use('/api/leave-balances', leaveBalanceRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin/audit-logs', auditRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/holidays', holidayRoutes);

  // 404 and error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
