import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Department } from './department.model.js';
import { AuthenticatedRequest, requireAuth, requireAdmin } from '../../middleware/auth.middleware.js';
import { AppError } from '../../middleware/error.middleware.js';
import { createAuditLog } from '../../utils/audit.service.js';

const router = Router();

const deptSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(10).toUpperCase(),
  description: z.string().max(500).optional(),
  head: z.string().optional().refine((v) => !v || Types.ObjectId.isValid(v), 'Invalid head ID'),
});

// GET /api/departments
router.get('/', requireAuth, async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('head', 'firstName lastName employeeId')
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: departments });
  } catch (err) {
    next(err);
  }
});

// POST /api/departments
router.post('/', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = deptSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());
    }

    const dept = await Department.create(parsed.data);

    await createAuditLog({
      actor: req.user?._id,
      actorEmail: req.user?.email,
      action: 'department.created',
      entityType: 'Department',
      entityId: dept._id,
      description: `Created department ${dept.code} - ${dept.name}`,
    });

    res.status(201).json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/departments/:id
router.patch('/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid department ID');

    const parsed = deptSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());
    }

    const dept = await Department.findByIdAndUpdate(id, { $set: parsed.data }, { new: true, runValidators: true });
    if (!dept) throw new AppError(404, 'Department not found');

    await createAuditLog({
      actor: req.user?._id,
      actorEmail: req.user?.email,
      action: 'department.updated',
      entityType: 'Department',
      entityId: dept._id,
      description: `Updated department ${dept.code}`,
    });

    res.json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
});

export default router;
