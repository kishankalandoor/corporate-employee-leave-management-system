import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { LeaveType, LeavePolicy } from './leave-type.model.js';
import { AuthenticatedRequest, requireAuth, requireAdmin } from '../../middleware/auth.middleware.js';
import { AppError } from '../../middleware/error.middleware.js';
import { createAuditLog } from '../../utils/audit.service.js';

const router = Router();

const leaveTypeSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(10).toUpperCase(),
  description: z.string().max(500).optional(),
  isPaid: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
  allowHalfDay: z.boolean().default(false),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#0d6efd'),
});

const leavePolicySchema = z.object({
  leaveType: z.string().refine((v) => Types.ObjectId.isValid(v)),
  department: z.string().optional().refine((v) => !v || Types.ObjectId.isValid(v)),
  employmentStatus: z.enum(['full-time', 'part-time', 'contract', 'on-notice', 'all']).default('all'),
  annualEntitlement: z.number().min(0),
  carryForwardAllowed: z.boolean().default(false),
  maxCarryForwardDays: z.number().min(0).default(0),
  minAdvanceNoticeDays: z.number().min(0).default(0),
  maxConsecutiveDays: z.number().min(1).optional(),
  allowPastDating: z.boolean().default(false),
  policyYear: z.number().default(new Date().getFullYear()),
});

// GET /api/leave-types
router.get('/', requireAuth, async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const leaveTypes = await LeaveType.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json({ success: true, data: leaveTypes });
  } catch (err) {
    next(err);
  }
});

// POST /api/leave-types
router.post('/', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = leaveTypeSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());

    const lt = await LeaveType.create(parsed.data);

    await createAuditLog({
      actor: req.user?._id,
      actorEmail: req.user?.email,
      action: 'policy.created',
      entityType: 'LeaveType',
      entityId: lt._id,
      description: `Created leave type ${lt.code} - ${lt.name}`,
    });

    res.status(201).json({ success: true, data: lt });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/leave-types/:id
router.patch('/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid leave type ID');

    const parsed = leaveTypeSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());

    const lt = await LeaveType.findByIdAndUpdate(id, { $set: parsed.data }, { new: true, runValidators: true });
    if (!lt) throw new AppError(404, 'Leave type not found');

    res.json({ success: true, data: lt });
  } catch (err) {
    next(err);
  }
});

// GET /api/leave-policies
router.get('/policies', requireAuth, async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const policies = await LeavePolicy.find()
      .populate('leaveType', 'name code color')
      .populate('department', 'name code')
      .sort({ policyYear: -1 })
      .lean();
    res.json({ success: true, data: policies });
  } catch (err) {
    next(err);
  }
});

// POST /api/leave-policies
router.post('/policies', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = leavePolicySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());

    const policy = await LeavePolicy.create(parsed.data);
    
    await createAuditLog({
      actor: req.user?._id,
      actorEmail: req.user?.email,
      action: 'policy.created',
      entityType: 'LeavePolicy',
      entityId: policy._id,
      description: `Created leave policy for year ${policy.policyYear}`,
    });

    res.status(201).json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/leave-policies/:id
router.patch('/policies/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid policy ID');

    const parsed = leavePolicySchema.partial().safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());

    const policy = await LeavePolicy.findByIdAndUpdate(id, { $set: parsed.data }, { new: true, runValidators: true });
    if (!policy) throw new AppError(404, 'Leave policy not found');

    res.json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
});

export default router;
