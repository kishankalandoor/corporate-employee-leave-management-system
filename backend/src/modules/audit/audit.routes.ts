import { Router, Response, NextFunction } from 'express';
import { AuditLog } from './audit-log.model.js';
import { AuthenticatedRequest, requireAuth, requireAdmin } from '../../middleware/auth.middleware.js';

const router = Router();

// GET /api/admin/audit-logs
router.get('/', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(String(req.query.page ?? 1), 10);
    const limit = Math.min(parseInt(String(req.query.limit ?? 50), 10), 200);
    const { action, entityType, actorEmail, startDate, endDate } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (actorEmail) filter.actorEmail = { $regex: actorEmail, $options: 'i' };
    if (startDate) filter.createdAt = { $gte: new Date(String(startDate)) };
    if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(String(endDate)) };

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actor', 'firstName lastName employeeId')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
