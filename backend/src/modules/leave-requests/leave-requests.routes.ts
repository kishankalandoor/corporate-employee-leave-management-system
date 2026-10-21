import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { LeaveRequest } from './leave-request.model.js';
import { LeaveType } from '../leave-types/leave-type.model.js';
import { User } from '../users/user.model.js';
import { AuthenticatedRequest, requireAuth, requireAdmin } from '../../middleware/auth.middleware.js';
import { AppError } from '../../middleware/error.middleware.js';
import { calculateWorkingDays, toDateOnly, dateRangesOverlap } from '../../utils/working-days.service.js';
import { reservePendingDays } from '../../utils/leave-balance.service.js';
import { createAuditLog } from '../../utils/audit.service.js';
import { notifyLeaveSubmitted, notifyLeaveCancelled } from '../../utils/notification.service.js';
import { leaveRequestsTotal } from '../../observability/metrics.js';

const router = Router();

const applyLeaveSchema = z.object({
  leaveType: z.string().refine((v) => Types.ObjectId.isValid(v), 'Invalid leave type ID'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  isHalfDay: z.boolean().default(false),
  halfDayType: z.enum(['first-half', 'second-half']).optional(),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000),
});

const leaveQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  leaveType: z.string().optional(),
  employeeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  department: z.string().optional(),
});

// GET /api/leaves
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query = leaveQuerySchema.parse(req.query);
    const { page, limit, status, leaveType, startDate, endDate } = query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    // Scope by role
    if (req.user?.role === 'employee') {
      filter.employee = req.user._id;
    } else if (req.user?.role === 'manager') {
      // Manager sees requests from their team
      const teamMembers = await User.find({ manager: req.user._id }, '_id').lean();
      const teamIds = teamMembers.map((m) => m._id);
      filter.employee = { $in: teamIds };
    }
    // Admin sees all

    if (status) filter.status = status;
    if (leaveType && Types.ObjectId.isValid(leaveType)) filter.leaveType = leaveType;
    if (startDate) filter.startDate = { $gte: new Date(startDate) };
    if (endDate) filter.endDate = { ...filter.endDate, $lte: new Date(endDate) };

    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate('employee', 'firstName lastName employeeId email department')
        .populate('leaveType', 'name code color')
        .populate('approver', 'firstName lastName employeeId')
        .skip(skip)
        .limit(limit)
        .sort({ submittedAt: -1 })
        .lean(),
      LeaveRequest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/leaves
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = applyLeaveSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());

    const { leaveType: leaveTypeId, startDate: startStr, endDate: endStr, isHalfDay, halfDayType, reason } = parsed.data;

    const startDate = toDateOnly(startStr);
    const endDate = toDateOnly(endStr);

    if (endDate < startDate) {
      throw new AppError(422, 'End date must be on or after start date');
    }

    if (isHalfDay && startStr !== endStr) {
      throw new AppError(422, 'Half-day requests must have the same start and end date');
    }

    const leaveType = await LeaveType.findById(leaveTypeId);
    if (!leaveType || !leaveType.isActive) throw new AppError(404, 'Leave type not found or inactive');

    if (isHalfDay && !leaveType.allowHalfDay) {
      throw new AppError(422, `Half-day leave is not allowed for ${leaveType.name}`);
    }

    // Check for overlapping requests
    const overlapping = await LeaveRequest.findOne({
      employee: req.user!._id,
      status: { $in: ['pending', 'approved'] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    });

    if (overlapping) {
      throw new AppError(409, `You already have an overlapping leave request (${overlapping.requestNumber})`, 'OVERLAPPING_REQUEST');
    }

    // Calculate working days
    const workingDays = await calculateWorkingDays(startDate, endDate, isHalfDay);
    if (workingDays === 0) {
      throw new AppError(422, 'The selected date range contains no working days');
    }

    // Check balance for paid leave
    if (leaveType.isPaid) {
      const currentYear = startDate.getUTCFullYear();
      const { LeaveBalance } = await import('../leave-balances/leave-balance.model.js');
      const balance = await LeaveBalance.findOne({
        employee: req.user!._id,
        leaveType: leaveTypeId,
        policyYear: currentYear,
      });

      if (!balance) throw new AppError(422, `No leave balance record found for ${leaveType.name}`);

      const available = balance.entitlement + balance.carryForward + balance.adjustments - balance.usedDays;
      if (available < workingDays) {
        throw new AppError(422, `Insufficient leave balance. Available: ${available} days, Requested: ${workingDays} days`, 'INSUFFICIENT_BALANCE');
      }
    }

    // Find manager for notification
    const employee = await User.findById(req.user!._id).populate('manager');
    const managerId = (employee?.manager as Types.ObjectId | null) ?? null;

    const requestNumber = `LR-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;

    const leaveRequest = await LeaveRequest.create({
      requestNumber,
      employee: req.user!._id,
      leaveType: leaveTypeId,
      startDate,
      endDate,
      isHalfDay,
      halfDayType: isHalfDay ? halfDayType : undefined,
      workingDays,
      reason,
      status: 'pending',
      submittedAt: new Date(),
    });

    // Reserve pending days for paid leave
    if (leaveType.isPaid) {
      await reservePendingDays(
        req.user!._id as Types.ObjectId,
        new Types.ObjectId(leaveTypeId),
        workingDays,
        startDate.getUTCFullYear()
      );
    }

    // Notifications
    if (managerId) {
      await notifyLeaveSubmitted(
        req.user!._id as Types.ObjectId,
        managerId,
        requestNumber,
        `${req.user!.firstName} ${req.user!.lastName}`
      );
    }

    await createAuditLog({
      actor: req.user?._id,
      actorEmail: req.user?.email,
      action: 'leave.submitted',
      entityType: 'LeaveRequest',
      entityId: leaveRequest._id,
      description: `Submitted leave request ${requestNumber} for ${workingDays} days`,
    });

    leaveRequestsTotal.inc({ leave_type: leaveType.code, status: 'pending' });

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('leaveType', 'name code color')
      .populate('employee', 'firstName lastName employeeId');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
});

// GET /api/leaves/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid request ID');

    const request = await LeaveRequest.findById(id)
      .populate('employee', 'firstName lastName employeeId email department manager')
      .populate('leaveType', 'name code color isPaid')
      .populate('approver', 'firstName lastName employeeId')
      .lean();

    if (!request) throw new AppError(404, 'Leave request not found');

    // Authorization check
    const employeeId = (request.employee as { _id: Types.ObjectId })._id?.toString();
    if (req.user?.role === 'employee' && employeeId !== req.user._id.toString()) {
      throw new AppError(403, 'Access denied');
    }
    if (req.user?.role === 'manager') {
      const emp = await User.findById(employeeId).lean();
      if (!emp || emp.manager?.toString() !== req.user._id.toString()) {
        throw new AppError(403, 'Access denied');
      }
    }

    res.json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/leaves/:id/cancel
router.patch('/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid request ID');

    const request = await LeaveRequest.findById(id).populate('leaveType');
    if (!request) throw new AppError(404, 'Leave request not found');

    // Only the owner or admin can cancel
    const isOwner = request.employee.toString() === req.user!._id.toString();
    const isAdmin = req.user?.role === 'admin';
    if (!isOwner && !isAdmin) throw new AppError(403, 'Access denied');

    // Only pending requests can be cancelled by employees
    if (request.status === 'cancelled') throw new AppError(409, 'Request is already cancelled');
    if (request.status === 'rejected') throw new AppError(409, 'Cannot cancel a rejected request');
    if (request.status === 'approved' && !isAdmin) {
      throw new AppError(409, 'Approved requests can only be cancelled by an administrator');
    }

    const previousStatus = request.status;
    
    await LeaveRequest.findByIdAndUpdate(id, {
      $set: { status: 'cancelled', cancelledAt: new Date(), cancelledBy: req.user!._id },
    });

    const leaveType = request.leaveType as unknown as { _id: Types.ObjectId; isPaid: boolean };
    const leaveTypeId = leaveType?._id || (request.leaveType as Types.ObjectId);
    
    // Restore balance
    if (leaveType?.isPaid) {
      if (previousStatus === 'pending') {
        const { releasePendingDays } = await import('../../utils/leave-balance.service.js');
        await releasePendingDays(
          request.employee as Types.ObjectId,
          leaveTypeId,
          request.workingDays,
          request.startDate.getUTCFullYear()
        );
      } else if (previousStatus === 'approved') {
        const { restoreApprovedDays } = await import('../../utils/leave-balance.service.js');
        await restoreApprovedDays(
          request.employee as Types.ObjectId,
          leaveTypeId,
          request.workingDays,
          request.startDate.getUTCFullYear()
        );
      }
    }

    await notifyLeaveCancelled(request.employee as Types.ObjectId, request.requestNumber);

    await createAuditLog({
      actor: req.user?._id,
      actorEmail: req.user?.email,
      action: 'leave.cancelled',
      entityType: 'LeaveRequest',
      entityId: request._id,
      description: `Cancelled leave request ${request.requestNumber}`,
    });

    res.json({ success: true, message: 'Leave request cancelled successfully' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/leaves/:id/override
// Super Admin / Admin can revoke, reverse, or change any leave status (e.g. from cancelled to approved)
router.patch(
  '/:id/override',
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid request ID');

      const { targetStatus, reason } = req.body;
      const validStatuses = ['approved', 'rejected', 'cancelled', 'pending'];
      if (!targetStatus || !validStatuses.includes(targetStatus)) {
        throw new AppError(400, `Target status must be one of: ${validStatuses.join(', ')}`);
      }

      const request = await LeaveRequest.findById(id).populate('leaveType');
      if (!request) throw new AppError(404, 'Leave request not found');

      const previousStatus = request.status;
      if (previousStatus === targetStatus) {
        res.json({ success: true, message: `Request is already in '${targetStatus}' status`, data: request });
        return;
      }

      const leaveType = request.leaveType as unknown as { _id: Types.ObjectId; isPaid: boolean };
      const leaveTypeId = leaveType?._id || (request.leaveType as Types.ObjectId);
      const policyYear = request.startDate.getUTCFullYear();

      // Adjust leave balances if paid leave
      if (leaveType?.isPaid) {
        const { transitionBalanceForStatusChange } = await import('../../utils/leave-balance.service.js');
        await transitionBalanceForStatusChange(
          request.employee as Types.ObjectId,
          leaveTypeId,
          previousStatus,
          targetStatus,
          request.workingDays,
          policyYear
        );
      }

      // Update leave request fields
      const updateFields: any = {
        status: targetStatus,
      };
      if (targetStatus === 'approved') {
        updateFields.decidedBy = req.user!._id;
        updateFields.decidedAt = new Date();
        updateFields.rejectionReason = null;
        updateFields.cancelledAt = null;
        updateFields.cancelledBy = null;
      } else if (targetStatus === 'rejected') {
        updateFields.decidedBy = req.user!._id;
        updateFields.decidedAt = new Date();
        updateFields.rejectionReason = reason || 'Admin status override to rejected';
        updateFields.cancelledAt = null;
        updateFields.cancelledBy = null;
      } else if (targetStatus === 'cancelled') {
        updateFields.cancelledAt = new Date();
        updateFields.cancelledBy = req.user!._id;
      } else if (targetStatus === 'pending') {
        updateFields.decidedBy = null;
        updateFields.decidedAt = null;
        updateFields.rejectionReason = null;
        updateFields.cancelledAt = null;
        updateFields.cancelledBy = null;
      }

      const updatedRequest = await LeaveRequest.findByIdAndUpdate(id, { $set: updateFields }, { new: true })
        .populate('leaveType')
        .populate('employee', 'firstName lastName email employeeId');

      // Send in-app notification to the employee
      const { Notification } = await import('../notifications/notification.model.js');
      await Notification.create({
        recipient: request.employee as Types.ObjectId,
        type: 'system',
        title: `Leave Status Overridden: ${request.requestNumber}`,
        message: `Your leave request ${request.requestNumber} status has been updated from '${previousStatus}' to '${targetStatus}' by Administrator.${reason ? ` Reason: ${reason}` : ''}`,
        relatedEntity: {
          entityType: 'LeaveRequest',
          entityId: request._id,
        },
      });

      // Create comprehensive audit log
      await createAuditLog({
        actor: req.user!._id,
        actorEmail: req.user?.email,
        action: 'leave.override_status',
        entityType: 'LeaveRequest',
        entityId: request._id,
        description: `Admin changed leave ${request.requestNumber} status from "${previousStatus}" to "${targetStatus}". Reason: ${reason || 'Administrative override'}`,
      });

      res.json({
        success: true,
        message: `Leave status successfully updated to ${targetStatus}`,
        data: updatedRequest,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
