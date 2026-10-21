import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { LeaveBalance } from './leave-balance.model.js';
import { LeaveType } from '../leave-types/leave-type.model.js';
import { AuthenticatedRequest, requireAuth, requireAdmin, requireManagerOrAdmin } from '../../middleware/auth.middleware.js';
import { AppError } from '../../middleware/error.middleware.js';
import { applyManualAdjustment } from '../../utils/leave-balance.service.js';
import { createAuditLog } from '../../utils/audit.service.js';

const router = Router();

const adjustmentSchema = z.object({
  leaveTypeId: z.string().refine((v) => Types.ObjectId.isValid(v)),
  adjustmentDays: z.number().min(-365).max(365),
  reason: z.string().min(5).max(500),
  policyYear: z.number().optional().default(new Date().getFullYear()),
});

// GET /api/leave-balances/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(String(req.query.year ?? new Date().getFullYear()), 10);
    const balances = await LeaveBalance.find({
      employee: req.user!._id,
      policyYear: year,
    })
      .populate('leaveType', 'name code color isPaid allowHalfDay')
      .lean();

    // Add virtual available
    const enriched = balances.map((b) => ({
      ...b,
      available: Math.max(0, b.entitlement + b.carryForward + b.adjustments - b.usedDays),
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

// GET /api/leave-balances/:employeeId
router.get('/:employeeId', requireAuth, requireManagerOrAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.params.employeeId as string;
    if (!Types.ObjectId.isValid(employeeId)) throw new AppError(400, 'Invalid employee ID');

    const year = parseInt(String(req.query.year ?? new Date().getFullYear()), 10);
    const balances = await LeaveBalance.find({
      employee: employeeId,
      policyYear: year,
    })
      .populate('leaveType', 'name code color isPaid')
      .lean();

    const enriched = balances.map((b) => ({
      ...b,
      available: Math.max(0, b.entitlement + b.carryForward + b.adjustments - b.usedDays),
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

// POST /api/leave-balances/:employeeId/adjustments
router.post('/:employeeId/adjustments', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.params.employeeId as string;
    if (!Types.ObjectId.isValid(employeeId)) throw new AppError(400, 'Invalid employee ID');

    const parsed = adjustmentSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());

    const { leaveTypeId, adjustmentDays, reason, policyYear } = parsed.data;

    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType) throw new AppError(404, 'Leave type not found');

    const result = await applyManualAdjustment(
      new Types.ObjectId(employeeId),
      new Types.ObjectId(leaveTypeId),
      adjustmentDays,
      policyYear
    );

    if (!result.success) throw new AppError(404, result.message ?? 'Balance adjustment failed');

    await createAuditLog({
      actor: req.user?._id,
      actorEmail: req.user?.email,
      action: 'balance.adjusted',
      entityType: 'LeaveBalance',
      entityId: employeeId,
      description: `Adjusted ${leaveType.name} balance by ${adjustmentDays} days for employee ${employeeId}. Reason: ${reason}`,
      metadata: { leaveTypeId, adjustmentDays, reason, policyYear },
    });

    res.json({ success: true, message: `Balance adjusted by ${adjustmentDays} days` });
  } catch (err) {
    next(err);
  }
});

export default router;
