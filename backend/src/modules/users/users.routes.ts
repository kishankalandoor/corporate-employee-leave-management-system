import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import argon2 from 'argon2';
import { Types } from 'mongoose';
import { User } from './user.model.js';
import { Department } from '../departments/department.model.js';
import { LeaveBalance } from '../leave-balances/leave-balance.model.js';
import { LeaveType } from '../leave-types/leave-type.model.js';
import { AuthenticatedRequest, requireAuth, requireAdmin, requireManagerOrAdmin } from '../../middleware/auth.middleware.js';
import { AppError } from '../../middleware/error.middleware.js';
import { createAuditLog } from '../../utils/audit.service.js';

const router = Router();

const createUserSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().toLowerCase(),
  employeeId: z.string().regex(/^EXL-\d{4,6}$/, 'Employee ID must be in format EXL-XXXX'),
  role: z.enum(['employee', 'manager', 'admin']),
  department: z.string().refine((v) => Types.ObjectId.isValid(v), 'Invalid department ID'),
  manager: z.string().optional().refine((v) => !v || Types.ObjectId.isValid(v), 'Invalid manager ID'),
  jobTitle: z.string().min(1).max(150),
  joiningDate: z.string().transform((v) => new Date(v)),
  phone: z.string().max(20).optional(),
  employmentStatus: z.enum(['full-time', 'part-time', 'contract', 'on-notice']).default('full-time'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const updateUserSchema = createUserSchema.omit({ password: true, email: true, employeeId: true }).partial();

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(['employee', 'manager', 'admin']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// GET /api/employees
router.get('/', requireAuth, requireManagerOrAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query = paginationSchema.parse(req.query);
    const { page, limit, search, department, role, status } = query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }
    if (department) filter.department = department;
    if (role) filter.role = role;
    if (status) filter.status = status;

    // Manager can only see their direct reports and themselves
    if (req.user?.role === 'manager') {
      filter.$or = [
        { manager: req.user._id },
        { _id: req.user._id },
      ];
    }

    const skip = (page - 1) * limit;
    const [employees, total] = await Promise.all([
      User.find(filter)
        .populate('department', 'name code')
        .populate('manager', 'firstName lastName employeeId')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: employees,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/employees
router.post('/', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());
    }

    const { password, ...userData } = parsed.data;

    // Check duplicates
    const existing = await User.findOne({ $or: [{ email: userData.email }, { employeeId: userData.employeeId }] });
    if (existing) {
      throw new AppError(409, 'An employee with this email or employee ID already exists', 'DUPLICATE_EMPLOYEE');
    }

    const dept = await Department.findById(userData.department);
    if (!dept) throw new AppError(404, 'Department not found');

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    const user = await User.create({ ...userData, passwordHash });

    // Initialize leave balances for the new year
    const leaveTypes = await LeaveType.find({ isActive: true });
    const currentYear = new Date().getFullYear();
    await Promise.all(
      leaveTypes.map((lt) =>
        LeaveBalance.findOneAndUpdate(
          { employee: user._id, leaveType: lt._id, policyYear: currentYear },
          { $setOnInsert: { entitlement: 12, carryForward: 0, adjustments: 0, usedDays: 0, pendingDays: 0 } },
          { upsert: true, new: true }
        )
      )
    );

    await createAuditLog({
      actor: req.user?._id,
      actorEmail: req.user?.email,
      action: 'user.created',
      entityType: 'User',
      entityId: user._id,
      description: `Created employee ${user.employeeId} - ${user.firstName} ${user.lastName}`,
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// GET /api/employees/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid employee ID');

    const user = await User.findById(id)
      .populate('department', 'name code')
      .populate('manager', 'firstName lastName employeeId email jobTitle')
      .lean();

    if (!user) throw new AppError(404, 'Employee not found');

    // Scope: employee can only see themselves
    if (req.user?.role === 'employee' && user._id.toString() !== req.user._id.toString()) {
      throw new AppError(403, 'Access denied', 'FORBIDDEN');
    }

    // Manager can only see their team
    if (req.user?.role === 'manager') {
      const isOwnProfile = user._id.toString() === req.user._id.toString();
      const isTeamMember = user.manager?.toString() === req.user._id.toString();
      if (!isOwnProfile && !isTeamMember) {
        throw new AppError(403, 'Access denied', 'FORBIDDEN');
      }
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employees/:id
router.patch('/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid employee ID');

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());
    }

    const user = await User.findByIdAndUpdate(id, { $set: parsed.data }, { new: true, runValidators: true })
      .populate('department', 'name code')
      .populate('manager', 'firstName lastName employeeId');

    if (!user) throw new AppError(404, 'Employee not found');

    await createAuditLog({
      actor: req.user?._id,
      actorEmail: req.user?.email,
      action: 'user.updated',
      entityType: 'User',
      entityId: user._id,
      description: `Updated employee ${user.employeeId}`,
      metadata: { changes: parsed.data },
    });

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employees/:id/status
router.patch('/:id/status', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid employee ID');

    const { status } = z.object({ status: z.enum(['active', 'inactive']) }).parse(req.body);

    const user = await User.findByIdAndUpdate(id, { $set: { status } }, { new: true });
    if (!user) throw new AppError(404, 'Employee not found');

    await createAuditLog({
      actor: req.user?._id,
      actorEmail: req.user?.email,
      action: status === 'active' ? 'user.activated' : 'user.deactivated',
      entityType: 'User',
      entityId: user._id,
      description: `${status === 'active' ? 'Activated' : 'Deactivated'} employee ${user.employeeId}`,
    });

    res.json({ success: true, data: { status: user.status } });
  } catch (err) {
    next(err);
  }
});

export default router;
