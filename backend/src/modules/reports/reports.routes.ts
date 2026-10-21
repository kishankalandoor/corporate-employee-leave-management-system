import { Router, Response, NextFunction } from 'express';
import { LeaveRequest } from '../leave-requests/leave-request.model.js';
import { User } from '../users/user.model.js';
import { AuthenticatedRequest, requireAuth, requireManagerOrAdmin } from '../../middleware/auth.middleware.js';
import { AppError } from '../../middleware/error.middleware.js';
import { Types } from 'mongoose';

const router = Router();

function sanitizeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  // Prevent formula injection
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  // Escape double quotes
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
}

function buildReportFilter(req: AuthenticatedRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  const { status, leaveType, department, employeeId, startDate, endDate } = req.query;

  if (req.user?.role === 'manager') {
    // Manager only sees their team - will be applied after team lookup
  }

  if (status) filter.status = status;
  if (leaveType && Types.ObjectId.isValid(String(leaveType))) filter.leaveType = leaveType;
  if (startDate) filter.startDate = { $gte: new Date(String(startDate)) };
  if (endDate) filter.endDate = { ...filter.endDate, $lte: new Date(String(endDate)) };

  return filter;
}

// GET /api/reports/leaves
router.get('/leaves', requireAuth, requireManagerOrAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(String(req.query.page ?? 1), 10);
    const limit = Math.min(parseInt(String(req.query.limit ?? 50), 10), 500);
    const filter = buildReportFilter(req);

    if (req.user?.role === 'manager') {
      const team = await User.find({ manager: req.user._id }, '_id').lean();
      filter.employee = { $in: team.map((t) => t._id) };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate('employee', 'firstName lastName employeeId department')
        .populate({ path: 'employee', populate: { path: 'department', select: 'name' } })
        .populate('leaveType', 'name code')
        .populate('approver', 'firstName lastName employeeId')
        .skip(skip)
        .limit(limit)
        .sort({ submittedAt: -1 })
        .lean(),
      LeaveRequest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/leaves/export (CSV)
router.get('/leaves/export', requireAuth, requireManagerOrAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const filter = buildReportFilter(req);

    if (req.user?.role === 'manager') {
      const team = await User.find({ manager: req.user._id }, '_id').lean();
      filter.employee = { $in: team.map((t) => t._id) };
    }

    const requests = await LeaveRequest.find(filter)
      .populate('employee', 'firstName lastName employeeId')
      .populate({ path: 'employee', populate: { path: 'department', select: 'name' } })
      .populate('leaveType', 'name code')
      .populate('approver', 'firstName lastName')
      .limit(5000)
      .sort({ submittedAt: -1 })
      .lean();

    const headers = ['Request Number', 'Employee ID', 'Employee Name', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Working Days', 'Status', 'Submitted At', 'Approver', 'Approved At', 'Comments'];

    const rows = requests.map((r) => {
      const emp = r.employee as unknown as { firstName?: string; lastName?: string; employeeId?: string; department?: { name?: string } };
      const lt = r.leaveType as unknown as { name?: string };
      const approver = r.approver as unknown as { firstName?: string; lastName?: string } | null;
      return [
        r.requestNumber,
        emp?.employeeId ?? '',
        `${emp?.firstName ?? ''} ${emp?.lastName ?? ''}`.trim(),
        emp?.department?.name ?? '',
        lt?.name ?? '',
        r.startDate.toISOString().split('T')[0],
        r.endDate.toISOString().split('T')[0],
        r.workingDays,
        r.status,
        r.submittedAt.toISOString(),
        approver ? `${approver.firstName ?? ''} ${approver.lastName ?? ''}`.trim() : '',
        r.approvedAt?.toISOString() ?? '',
        r.approverComments ?? '',
      ].map(sanitizeCsvCell);
    });

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leave-report-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;
