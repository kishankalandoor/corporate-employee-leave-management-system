import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { LeaveRequest } from '../leave-requests/leave-request.model.js';
import { User } from '../users/user.model.js';
import { AuthenticatedRequest, requireAuth, requireManagerOrAdmin } from '../../middleware/auth.middleware.js';
import { AppError } from '../../middleware/error.middleware.js';
import { consumeApprovedDays, releasePendingDays } from '../../utils/leave-balance.service.js';
import { createAuditLog } from '../../utils/audit.service.js';
import { notifyLeaveApproved, notifyLeaveRejected } from '../../utils/notification.service.js';
import { leaveApprovalsTotal, pendingApprovalsGauge } from '../../observability/metrics.js';
import { LeaveType } from '../leave-types/leave-type.model.js';

const router = Router();

const approvalSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comments: z.string().max(1000).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  department: z.string().optional(),
});

async function getManagerTeamFilter(managerId: Types.ObjectId) {
  const teamMembers = await User.find({ manager: managerId }, '_id').lean();
  return { $in: teamMembers.map((m) => m._id) };
}

// GET /api/approvals/pending
router.get('/pending', requireAuth, requireManagerOrAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { status: 'pending' };

    if (req.user?.role === 'manager') {
      filter.employee = await getManagerTeamFilter(req.user._id as Types.ObjectId);
    }

    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate('employee', 'firstName lastName employeeId email department')
        .populate({ path: 'employee', populate: { path: 'department', select: 'name' } })
        .populate('leaveType', 'name code color')
        .skip(skip)
        .limit(limit)
        .sort({ submittedAt: 1 })
        .lean(),
      LeaveRequest.countDocuments(filter),
    ]);

    // Update gauge
    pendingApprovalsGauge.set(total);

    res.json({
      success: true,
      data: requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/approvals/history
router.get('/history', requireAuth, requireManagerOrAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      status: { $in: ['approved', 'rejected'] },
    };

    if (req.user?.role === 'manager') {
      filter.approver = req.user._id;
    }

    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate('employee', 'firstName lastName employeeId email')
        .populate('leaveType', 'name code color')
        .populate('approver', 'firstName lastName employeeId')
        .skip(skip)
        .limit(limit)
        .sort({ approvedAt: -1 })
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

// PATCH /api/approvals/:id
router.patch('/:id', requireAuth, requireManagerOrAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'Invalid request ID');

    const parsed = approvalSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR', parsed.error.flatten());

    const { decision, comments } = parsed.data;

    // Atomic update: only update if status is still 'pending' (idempotency)
    const request = await LeaveRequest.findOneAndUpdate(
      { _id: id, status: 'pending' },
      {
        $set: {
          status: decision,
          approver: req.user!._id,
          approvedAt: new Date(),
          approverComments: comments,
        },
      },
      { new: true }
    ).populate('leaveType');

    if (!request) {
      // Check if the request exists but is already processed
      const existing = await LeaveRequest.findById(id);
      if (!existing) throw new AppError(404, 'Leave request not found');
      throw new AppError(409, `This request has already been ${existing.status}`, 'ALREADY_PROCESSED');
    }

    // Authorization: manager can only approve their team's requests
    if (req.user?.role === 'manager') {
      const employee = await User.findById(request.employee);
      if (!employee || employee.manager?.toString() !== req.user._id.toString()) {
        // Rollback the update
        await LeaveRequest.findByIdAndUpdate(id, { $set: { status: 'pending', approver: null, approvedAt: null } });
        throw new AppError(403, 'You can only approve requests from your direct team members');
      }

      // Prevent self-approval
      if (request.employee.toString() === req.user._id.toString()) {
        await LeaveRequest.findByIdAndUpdate(id, { $set: { status: 'pending', approver: null, approvedAt: null } });
        throw new AppError(403, 'You cannot approve your own leave request');
      }
    }

    const leaveType = request.leaveType as unknown as { _id: Types.ObjectId; isPaid: boolean; code: string };
    const leaveTypeId = leaveType?._id || (request.leaveType as Types.ObjectId);

    if (decision === 'approved') {
      // Consume the pending days as approved
      if (leaveType?.isPaid) {
        await consumeApprovedDays(
          request.employee as Types.ObjectId,
          leaveTypeId,
          request.workingDays,
          request.startDate.getUTCFullYear()
        );
      }
      await notifyLeaveApproved(request.employee as Types.ObjectId, request.requestNumber);
      leaveApprovalsTotal.inc({ decision: 'approved' });
    } else {
      // Release pending reservation
      if (leaveType?.isPaid) {
        await releasePendingDays(
          request.employee as Types.ObjectId,
          leaveTypeId,
          request.workingDays,
          request.startDate.getUTCFullYear()
        );
      }
      await notifyLeaveRejected(request.employee as Types.ObjectId, request.requestNumber, comments);
      leaveApprovalsTotal.inc({ decision: 'rejected' });
    }

    await createAuditLog({
      actor: req.user?._id,
      actorEmail: req.user?.email,
      action: decision === 'approved' ? 'leave.approved' : 'leave.rejected',
      entityType: 'LeaveRequest',
      entityId: request._id,
      description: `${decision === 'approved' ? 'Approved' : 'Rejected'} leave request ${request.requestNumber}`,
      metadata: { comments },
    });

    res.json({ success: true, data: request, message: `Leave request ${decision} successfully` });
  } catch (err) {
    next(err);
  }
});

export default router;
