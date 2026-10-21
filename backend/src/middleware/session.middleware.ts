import { Request, Response, NextFunction } from 'express';
import { User } from '../modules/users/user.model.js';
import { AuthenticatedRequest } from './auth.middleware.js';
import { logger } from '../config/logger.js';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

/**
 * Loads the authenticated user from session and attaches to req.user.
 * This runs on every request but does not enforce authentication.
 * Use requireAuth after this for protected routes.
 */
export async function loadUser(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.session?.userId) {
    return next();
  }

  try {
    const user = await User.findById(req.session.userId)
      .populate('department', 'name code')
      .populate('manager', 'firstName lastName email employeeId')
      .lean();

    if (!user || user.status === 'inactive') {
      // Clear stale session
      req.session.destroy(() => { /* noop */ });
      return next();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req.user = user as any;
    next();
  } catch (err) {
    logger.error({ err }, 'Error loading user from session');
    next();
  }
}
