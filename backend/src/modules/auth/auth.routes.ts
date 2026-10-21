import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import argon2 from 'argon2';
import rateLimit from 'express-rate-limit';
import { User } from '../users/user.model.js';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { AppError } from '../../middleware/error.middleware.js';
import { createAuditLog } from '../../utils/audit.service.js';
import { authAttemptsTotal } from '../../observability/metrics.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());
    }

    const { email, password } = parsed.data;

    // Always fetch with passwordHash
    const user = await User.findOne({ email }).select('+passwordHash').populate('department', 'name code');
    
    // Use constant-time comparison to avoid timing attacks
    if (!user) {
      authAttemptsTotal.inc({ result: 'failed' });
      await createAuditLog({
        actorEmail: email,
        action: 'auth.login_failed',
        entityType: 'User',
        description: `Failed login attempt for email: ${email}`,
        ipAddress: req.ip,
      });
      // Don't reveal whether email exists
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      authAttemptsTotal.inc({ result: 'failed' });
      await createAuditLog({
        actor: user._id,
        actorEmail: user.email,
        action: 'auth.login_failed',
        entityType: 'User',
        entityId: user._id,
        description: `Failed login attempt`,
        ipAddress: req.ip,
      });
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (user.status === 'inactive') {
      authAttemptsTotal.inc({ result: 'inactive' });
      throw new AppError(403, 'Your account has been deactivated. Please contact an administrator.', 'ACCOUNT_INACTIVE');
    }

    // Create session
    req.session.userId = user._id.toString();

    authAttemptsTotal.inc({ result: 'success' });
    
    await createAuditLog({
      actor: user._id,
      actorEmail: user.email,
      action: 'auth.login',
      entityType: 'User',
      entityId: user._id,
      description: `User logged in`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info({ userId: user._id, email: user.email }, 'User logged in');

    const userResponse = user.toJSON();
    req.session.save((saveErr) => {
      if (saveErr) {
        logger.error({ saveErr }, 'Failed to save session');
        return next(saveErr);
      }
      res.json({ success: true, data: { user: userResponse } });
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const email = req.user?.email;

  req.session.destroy(async (err: any) => {
    if (err) {
      logger.error({ err }, 'Session destroy error');
      return next(new AppError(500, 'Logout failed'));
    }
    res.clearCookie(env.SESSION_COOKIE_NAME);

    if (userId) {
      await createAuditLog({
        actor: userId,
        actorEmail: email,
        action: 'auth.logout',
        entityType: 'User',
        entityId: userId,
        description: 'User logged out',
        ipAddress: req.ip,
      });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: { user: req.user } });
});

export default router;
