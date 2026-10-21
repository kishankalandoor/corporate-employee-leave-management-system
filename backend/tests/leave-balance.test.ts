import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/env.js', () => ({
  env: {
    APP_TIMEZONE: 'Asia/Kolkata',
    NODE_ENV: 'test',
  },
}));

vi.mock('../src/modules/leave-balances/leave-balance.model.js', () => ({
  LeaveBalance: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
    create: vi.fn(),
  },
}));

import { Types } from 'mongoose';
import { LeaveBalance } from '../src/modules/leave-balances/leave-balance.model.js';
import {
  reservePendingDays,
  consumeApprovedDays,
  releasePendingDays,
  restoreApprovedDays,
  applyManualAdjustment,
  transitionBalanceForStatusChange,
} from '../src/utils/leave-balance.service.js';

describe('LeaveBalanceService', () => {
  const employeeId = new Types.ObjectId();
  const leaveTypeId = new Types.ObjectId();
  const balanceId = new Types.ObjectId();
  const year = 2026;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reservePendingDays', () => {
    it('should successfully reserve days when sufficient balance exists', async () => {
      vi.mocked(LeaveBalance.findOne).mockResolvedValue({
        _id: balanceId,
        entitlement: 15,
        carryForward: 2,
        adjustments: 0,
        usedDays: 3,
        pendingDays: 2,
      } as any);

      vi.mocked(LeaveBalance.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const result = await reservePendingDays(employeeId, leaveTypeId, 5, year);
      expect(result.success).toBe(true);
      expect(LeaveBalance.updateOne).toHaveBeenCalledWith(
        { _id: balanceId },
        { $inc: { pendingDays: 5 } }
      );
    });

    it('should reject reservation when balance is insufficient', async () => {
      vi.mocked(LeaveBalance.findOne).mockResolvedValue({
        _id: balanceId,
        entitlement: 10,
        carryForward: 0,
        adjustments: 0,
        usedDays: 8,
        pendingDays: 1,
      } as any);

      const result = await reservePendingDays(employeeId, leaveTypeId, 5, year);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient leave balance');
      expect(LeaveBalance.updateOne).not.toHaveBeenCalled();
    });

    it('should return error when balance record not found', async () => {
      vi.mocked(LeaveBalance.findOne).mockResolvedValue(null);

      const result = await reservePendingDays(employeeId, leaveTypeId, 2, year);
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('consumeApprovedDays', () => {
    it('should deduct pendingDays and add to usedDays atomically', async () => {
      vi.mocked(LeaveBalance.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const result = await consumeApprovedDays(employeeId, leaveTypeId, 3, year);
      expect(result.success).toBe(true);
      expect(LeaveBalance.updateOne).toHaveBeenCalledWith(
        {
          employee: employeeId,
          leaveType: leaveTypeId,
          policyYear: year,
          pendingDays: { $gte: 3 },
        },
        {
          $inc: { usedDays: 3, pendingDays: -3 },
        }
      );
    });
  });

  describe('releasePendingDays', () => {
    it('should decrement pendingDays when request is rejected or cancelled', async () => {
      vi.mocked(LeaveBalance.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      await releasePendingDays(employeeId, leaveTypeId, 2, year);
      expect(LeaveBalance.updateOne).toHaveBeenCalledWith(
        { employee: employeeId, leaveType: leaveTypeId, policyYear: year },
        { $inc: { pendingDays: -2 } }
      );
    });
  });

  describe('restoreApprovedDays', () => {
    it('should decrement usedDays when approved leave is cancelled by admin', async () => {
      vi.mocked(LeaveBalance.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      await restoreApprovedDays(employeeId, leaveTypeId, 4, year);
      expect(LeaveBalance.updateOne).toHaveBeenCalledWith(
        { employee: employeeId, leaveType: leaveTypeId, policyYear: year },
        { $inc: { usedDays: -4 } }
      );
    });
  });

  describe('applyManualAdjustment', () => {
    it('should adjust balance days', async () => {
      vi.mocked(LeaveBalance.updateOne).mockResolvedValue({ matchedCount: 1, modifiedCount: 1 } as any);

      const result = await applyManualAdjustment(employeeId, leaveTypeId, 2, year);
      expect(result.success).toBe(true);
      expect(LeaveBalance.updateOne).toHaveBeenCalledWith(
        { employee: employeeId, leaveType: leaveTypeId, policyYear: year },
        { $inc: { adjustments: 2 } }
      );
    });
  });

  describe('transitionBalanceForStatusChange (Admin Mind-Change / Revocation)', () => {
    it('should consume days when transitioning from cancelled to approved', async () => {
      vi.mocked(LeaveBalance.findOne).mockResolvedValue({
        _id: balanceId,
        entitlement: 15,
        carryForward: 0,
        adjustments: 0,
        usedDays: 2,
      } as any);
      vi.mocked(LeaveBalance.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const result = await transitionBalanceForStatusChange(
        employeeId,
        leaveTypeId,
        'cancelled',
        'approved',
        3,
        year
      );
      expect(result.success).toBe(true);
      expect(LeaveBalance.updateOne).toHaveBeenCalledWith(
        { employee: employeeId, leaveType: leaveTypeId, policyYear: year },
        { $inc: { usedDays: 3 } }
      );
    });

    it('should restore usedDays when transitioning from approved to cancelled', async () => {
      vi.mocked(LeaveBalance.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const result = await transitionBalanceForStatusChange(
        employeeId,
        leaveTypeId,
        'approved',
        'cancelled',
        4,
        year
      );
      expect(result.success).toBe(true);
      expect(LeaveBalance.updateOne).toHaveBeenCalledWith(
        { employee: employeeId, leaveType: leaveTypeId, policyYear: year },
        { $inc: { usedDays: -4 } }
      );
    });
  });
});
