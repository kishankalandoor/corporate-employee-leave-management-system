import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware.js';
import { IUser } from '../modules/users/user.model.js';
import { UserRole } from '../modules/users/user.model.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    return next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
  }
  next();
}

export function requireRoles(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to access this resource', 'FORBIDDEN'));
    }
    next();
  };
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireRoles('admin')(req, res, next);
}

export function requireManagerOrAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireRoles('manager', 'admin')(req, res, next);
}
