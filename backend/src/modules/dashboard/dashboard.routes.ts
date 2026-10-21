import { Router, Response, NextFunction } from 'express';
import { LeaveRequest } from '../leave-requests/leave-request.model.js';
import { User } from '../users/user.model.js';
import { LeaveBalance } from '../leave-balances/leave-balance.model.js';
import { AuthenticatedRequest, requireAuth, requireManagerOrAdmin, requireAdmin } from '../../middleware/auth.middleware.js';
import { toDateOnly } from '../../utils/working-days.service.js';

const router = Router();

function getTodayBounds() {
  const today = toDateOnly(new Date());
  const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
  const endOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
  return { startOfToday, endOfToday };
}

// GET /api/dashboard/employee
router.get('/employee', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const currentYear = new Date().getUTCFullYear();
    const { startOfToday, endOfToday } = getTodayBounds();

    const [balances, recentRequests, pendingCount, upcomingLeaves, deptColleaguesOnLeave] = await Promise.all([
      LeaveBalance.find({ employee: userId, policyYear: currentYear })
        .populate('leaveType', 'name code color')
        .lean(),
      LeaveRequest.find({ employee: userId })
        .populate('leaveType', 'name code color')
        .sort({ submittedAt: -1 })
        .limit(5)
        .lean(),
      LeaveRequest.countDocuments({ employee: userId, status: 'pending' }),
      LeaveRequest.find({
        employee: userId,
        status: 'approved',
        startDate: { $gte: startOfToday },
      })
        .populate('leaveType', 'name code color')
        .sort({ startDate: 1 })
        .limit(3)
        .lean(),
      // Colleagues in same department on leave today
      req.user?.department
        ? LeaveRequest.find({
            status: 'approved',
            startDate: { $lte: endOfToday },
            endDate: { $gte: startOfToday },
          })
            .populate({
              path: 'employee',
              select: 'firstName lastName email employeeId department jobTitle',
              match: { department: req.user.department, status: 'active', _id: { $ne: userId } },
            })
            .populate('leaveType', 'name code color')
            .lean()
            .then((leaves) => leaves.filter((l) => l.employee !== null))
        : Promise.resolve([]),
    ]);

    const enrichedBalances = balances.map((b) => ({
      ...b,
      available: Math.max(0, b.entitlement + b.carryForward + b.adjustments - b.usedDays),
    }));

    // Leave utilization by type (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const usagePipeline = await LeaveRequest.aggregate([
      { $match: { employee: userId, status: 'approved', startDate: { $gte: twelveMonthsAgo } } },
      { $lookup: { from: 'leavetypes', localField: 'leaveType', foreignField: '_id', as: 'leaveTypeInfo' } },
      { $unwind: '$leaveTypeInfo' },
      { $group: { _id: '$leaveTypeInfo.name', totalDays: { $sum: '$workingDays' }, color: { $first: '$leaveTypeInfo.color' } } },
    ]);

    res.json({
      success: true,
      data: {
        balances: enrichedBalances,
        recentRequests,
        pendingCount,
        upcomingLeaves,
        deptColleaguesOnLeave,
        usageByType: usagePipeline,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/manager
router.get('/manager', requireAuth, requireManagerOrAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const managerId = req.user!._id;
    const { startOfToday, endOfToday } = getTodayBounds();
    const tomorrow = new Date(startOfToday);
    tomorrow.setDate(tomorrow.getDate() + 30);

    const teamMembers = await User.find({ manager: managerId, status: 'active' }, '_id firstName lastName email employeeId department jobTitle').lean();
    const teamIds = teamMembers.map((m) => m._id);

    const [pendingCount, activeLeavesToday, upcomingAbsences, recentDecisions] = await Promise.all([
      LeaveRequest.countDocuments({ employee: { $in: teamIds }, status: 'pending' }),
      LeaveRequest.find({
        employee: { $in: teamIds },
        status: 'approved',
        startDate: { $lte: endOfToday },
        endDate: { $gte: startOfToday },
      })
        .populate('employee', 'firstName lastName email employeeId department jobTitle')
        .populate('leaveType', 'name code color')
        .lean(),
      LeaveRequest.find({
        employee: { $in: teamIds },
        status: 'approved',
        startDate: { $gte: startOfToday, $lte: tomorrow },
      })
        .populate('employee', 'firstName lastName email employeeId')
        .populate('leaveType', 'name code color')
        .sort({ startDate: 1 })
        .limit(10)
        .lean(),
      LeaveRequest.find({
        approver: managerId,
        status: { $in: ['approved', 'rejected'] },
      })
        .populate('employee', 'firstName lastName email employeeId')
        .populate('leaveType', 'name code color')
        .sort({ decidedAt: -1, approvedAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // Unique employees absent today
    const absentEmployeeIds = new Set(activeLeavesToday.map((l: any) => l.employee?._id?.toString()).filter(Boolean));
    const absentToday = absentEmployeeIds.size;
    const totalTeam = teamMembers.length;
    const presentToday = Math.max(0, totalTeam - absentToday);
    const attendanceRate = totalTeam > 0 ? Math.round((presentToday / totalTeam) * 100) : 100;

    // Team utilization
    const teamUtilization = await LeaveRequest.aggregate([
      { $match: { employee: { $in: teamIds }, status: 'approved' } },
      { $lookup: { from: 'leavetypes', localField: 'leaveType', foreignField: '_id', as: 'lt' } },
      { $unwind: '$lt' },
      { $group: { _id: '$lt.name', totalDays: { $sum: '$workingDays' }, color: { $first: '$lt.color' } } },
    ]);

    res.json({
      success: true,
      data: {
        teamSize: totalTeam,
        presentToday,
        absentToday,
        attendanceRate,
        absentEmployees: activeLeavesToday,
        pendingCount,
        teamOnLeave: activeLeavesToday,
        upcomingAbsences,
        recentDecisions,
        teamUtilization,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/admin
router.get('/admin', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const currentYear = new Date().getUTCFullYear();
    const { startOfToday, endOfToday } = getTodayBounds();

    const [
      totalEmployees,
      pendingApprovals,
      approvedThisYear,
      rejectedThisYear,
      activeLeavesToday,
      byLeaveType,
      monthlyTrend,
      departmentStats,
    ] = await Promise.all([
      User.countDocuments({ status: 'active' }),
      LeaveRequest.countDocuments({ status: 'pending' }),
      LeaveRequest.countDocuments({ status: 'approved', startDate: { $gte: new Date(`${currentYear}-01-01`) } }),
      LeaveRequest.countDocuments({ status: 'rejected', startDate: { $gte: new Date(`${currentYear}-01-01`) } }),
      LeaveRequest.find({
        status: 'approved',
        startDate: { $lte: endOfToday },
        endDate: { $gte: startOfToday },
      })
        .populate({
          path: 'employee',
          select: 'firstName lastName email employeeId department jobTitle',
          populate: { path: 'department', select: 'name code' },
        })
        .populate('leaveType', 'name code color')
        .sort({ startDate: 1 })
        .lean(),
      LeaveRequest.aggregate([
        { $match: { startDate: { $gte: new Date(`${currentYear}-01-01`) } } },
        { $lookup: { from: 'leavetypes', localField: 'leaveType', foreignField: '_id', as: 'lt' } },
        { $unwind: '$lt' },
        { $group: { _id: '$lt.name', count: { $sum: 1 }, days: { $sum: '$workingDays' }, color: { $first: '$lt.color' } } },
        { $sort: { count: -1 } },
      ]),
      LeaveRequest.aggregate([
        { $match: { startDate: { $gte: new Date(`${currentYear}-01-01`) } } },
        { $group: { _id: { month: { $month: '$startDate' }, status: '$status' }, count: { $sum: 1 } } },
        { $sort: { '_id.month': 1 } },
      ]),
      User.aggregate([
        { $match: { status: 'active' } },
        { $lookup: { from: 'departments', localField: 'department', foreignField: '_id', as: 'dept' } },
        { $unwind: '$dept' },
        { $group: { _id: '$dept.name', employeeCount: { $sum: 1 } } },
        { $sort: { employeeCount: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Calculate unique absent employees
    const absentEmployeeIds = new Set(
      activeLeavesToday.map((l: any) => l.employee?._id?.toString()).filter(Boolean)
    );
    const absentTodayCount = absentEmployeeIds.size;
    const presentTodayCount = Math.max(0, totalEmployees - absentTodayCount);
    const attendanceRate = totalEmployees > 0 ? Math.round((presentTodayCount / totalEmployees) * 100) : 100;

    res.json({
      success: true,
      data: {
        totalEmployees,
        presentToday: presentTodayCount,
        absentToday: absentTodayCount,
        attendanceRate,
        absentEmployees: activeLeavesToday,
        pendingApprovals,
        approvedThisYear,
        rejectedThisYear,
        onLeaveToday: absentTodayCount,
        byLeaveType,
        monthlyTrend,
        departmentStats,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
